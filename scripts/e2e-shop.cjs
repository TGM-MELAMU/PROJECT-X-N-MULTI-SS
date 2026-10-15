/* Browser test of the Phase 4 flow (cart, checkout, PayFast form, payment notification) against a running
 * DEV server (`next dev`, because the notification test switches only work outside production) and a DEV database.
 * Needs: PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE, PAYFAST_DEV_SIMULATE=true,
 *        PAYFAST_SKIP_SERVER_CONFIRM=true, PAYFAST_CHECK_IP=false on the server.
 * Usage: BASE=http://localhost:3100 DATABASE_URL=... PAYFAST_PASSPHRASE=... node scripts/e2e-shop.cjs */
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const mysql = require("mysql2/promise");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");

const BASE = process.env.BASE || "http://localhost:3100";
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE || "";
const EMAIL = `e2e-shop-${Date.now()}@example.com`;
const EMAIL2 = `e2e-other-${Date.now()}@example.com`;
const PW = "shop passphrase 42";
let passed = 0;
const ok = (n) => { passed++; console.log("  ok -", n); };
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");
const enc = (v) => encodeURIComponent(v.trim()).replace(/%20/g, "+").replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

function itnBody(fields) {
  const pairs = Object.entries(fields);
  const qs = pairs.map(([k, v]) => `${k}=${enc(String(v))}`).join("&");
  const sig = md5(PASSPHRASE ? `${qs}&passphrase=${enc(PASSPHRASE)}` : qs);
  return `${qs}&signature=${sig}`;
}
async function notify(body) {
  const r = await fetch(BASE + "/api/payfast/notify", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  return r.status;
}

async function register(page, email) {
  await page.goto("/register");
  await page.fill('input[name=firstName]', "Shop"); await page.fill('input[name=lastName]', "Tester");
  await page.fill('input[name=email]', email); await page.fill('input[name=password]', PW);
  await page.check('input[name=acceptTerms]'); await page.click('main form button[type=submit]');
  await page.waitForURL("**/account");
}
const cents = (t) => Math.round(Number(String(t).replace(/[^\d.-]/g, "")) * 100);

(async () => {
  const u = new URL(process.env.DATABASE_URL);
  const db = await mysql.createConnection({ host: u.hostname, port: +u.port || 3306, user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: u.pathname.slice(1) });
  const clean = async () => {
    await db.query("DELETE FROM payments WHERE order_id IN (SELECT order_id FROM orders WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'e2e-%@example.com'))");
    await db.query("DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'e2e-%@example.com'))");
    await db.query("DELETE FROM order_addresses WHERE order_id IN (SELECT order_id FROM orders WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'e2e-%@example.com'))");
    await db.query("DELETE FROM vendor_orders WHERE order_id IN (SELECT order_id FROM orders WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'e2e-%@example.com'))");
    await db.query("DELETE FROM orders WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'e2e-%@example.com')");
    await db.query("DELETE FROM cart_items WHERE cart_id IN (SELECT cart_id FROM carts WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'e2e-%@example.com'))");
    await db.query("DELETE FROM carts WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'e2e-%@example.com')");
    await db.query("DELETE FROM addresses WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'e2e-%@example.com')");
    await db.query("DELETE FROM user_tokens WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'e2e-%@example.com')");
    await db.query("DELETE ur FROM user_roles ur JOIN users x ON x.user_id=ur.user_id WHERE x.email LIKE 'e2e-%@example.com'");
    await db.query("DELETE FROM users WHERE email LIKE 'e2e-%@example.com'");
  };
  await clean();

  // Two sellable variants from two different vendors, with known stock. Original stock is restored at the end.
  const [cand] = await db.query(`SELECT v.variant_id, v.selling_price, p.slug, v.sku, p.vendor_id, p.product_name
    FROM product_variants v JOIN products p ON p.product_id=v.product_id
    WHERE v.variant_status='active' AND p.product_status='active' AND p.approval_status='approved' AND v.selling_price>0
    ORDER BY p.vendor_id, v.variant_id`);
  const A = cand[0];
  const B = cand.find((c) => c.vendor_id !== A.vendor_id) || cand.find((c) => c.variant_id !== A.variant_id);
  const twoVendors = A.vendor_id !== B.vendor_id;
  const orig = {};
  for (const v of [A, B]) {
    const [[row]] = await db.query("SELECT quantity_in_stock q FROM inventory WHERE variant_id=?", [v.variant_id]);
    orig[v.variant_id] = row ? row.q : null;
    await db.query("INSERT INTO inventory (variant_id, quantity_in_stock) VALUES (?,5) ON DUPLICATE KEY UPDATE quantity_in_stock=5", [v.variant_id]);
  }
  await db.query("UPDATE inventory SET quantity_in_stock=3 WHERE variant_id=?", [B.variant_id]);
  const stock = async (id) => (await db.query("SELECT quantity_in_stock q FROM inventory WHERE variant_id=?", [id]))[0][0].q;
  const pageA = `/product/${A.slug}?variant=${encodeURIComponent(A.sku)}`;
  const pageB = `/product/${B.slug}?variant=${encodeURIComponent(B.sku)}`;
  console.log(`   using A=${A.sku} (vendor ${A.vendor_id}) and B=${B.sku} (vendor ${B.vendor_id}); two vendors: ${twoVendors}`);

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  try {
    // 1. guest
    const g = await (await browser.newContext({ baseURL: BASE })).newPage();
    await g.goto(pageA);
    await g.locator("form:has(input[name=quantity]) button[type=submit]").click();
    await g.waitForURL(/\/login\?next=/);
    assert.match(decodeURIComponent(g.url()), new RegExp("/login\\?next=/product/" + A.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    ok("guest pressing Add to cart is sent to log in, with a way back");
    await g.goto("/checkout"); assert.match(g.url(), /\/login\?next=%2Fcheckout/);
    await g.goto("/order/MS-000000-AAAAA"); assert.match(g.url(), /\/login\?next=/);
    ok("guest is kept out of checkout and order pages");

    // 2. customer
    const ctx = await browser.newContext({ baseURL: BASE });
    const page = await ctx.newPage();
    await page.route("https://sandbox.payfast.co.za/**", async (route) => {
      globalThis.__pfPost = route.request().postData();
      await route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>PayFast stub</body></html>" });
    });
    await register(page, EMAIL);
    await page.goto("/cart"); await page.getByText("Your cart is empty").waitFor();
    ok("new customer starts with an empty cart");

    await page.goto(pageA);
    await page.locator('input[name=quantity]').fill("2");
    await page.locator("form:has(input[name=quantity]) button[type=submit]").click();
    await page.getByText("Added to your cart").waitFor();
    await page.locator("header").getByText("2 items in cart").first().waitFor({ state: "attached" });
    ok("add to cart works and the header count updates");

    await page.waitForFunction(() => document.querySelector("input[name=quantity]").value === "1"); // React resets the form after an add
    await page.locator('input[name=quantity]').fill("4");
    await page.locator("form:has(input[name=quantity]) button[type=submit]").click();
    await page.getByText(/Only 5 in stock, so your cart has 5/).waitFor();
    ok("adding more than the stock is capped, with a clear message");

    await page.goto(pageB);
    await page.locator('input[name=quantity]').fill("1");
    await page.locator("form:has(input[name=quantity]) button[type=submit]").click();
    await page.getByText("Added to your cart").waitFor();

    // 3. cart page
    await page.goto("/cart");
    await page.getByText(A.product_name).first().waitFor();
    const [[itemsRow]] = await db.query("SELECT ci.cart_item_id id, ci.quantity FROM cart_items ci JOIN carts c ON c.cart_id=ci.cart_id JOIN users u ON u.user_id=c.user_id WHERE u.email=? AND ci.variant_id=?", [EMAIL, A.variant_id]);
    assert.equal(itemsRow.quantity, 5);
    await page.locator(`#qty-${itemsRow.id}`).fill("2");
    await page.locator(`form:has(#qty-${itemsRow.id}) button`).click();
    await page.waitForFunction((id) => document.querySelector(`#qty-${id}`)?.value === "2", itemsRow.id);
    await page.waitForTimeout(400);
    assert.equal((await db.query("SELECT quantity FROM cart_items WHERE cart_item_id=?", [itemsRow.id]))[0][0].quantity, 2);
    ok("quantity can be changed in the cart");

    const expectItems = cents(A.selling_price) * 2 + cents(B.selling_price) * 1;
    const summary = await page.getByLabel("Order summary").innerText();
    assert.ok(summary.replace(/\s/g, " ").includes("Total"), summary);
    ok("cart shows an order summary");

    // 4. checkout validation, then place order
    await page.goto("/checkout");
    await page.getByRole("button", { name: "Place order and pay" }).click();
    await page.getByText("Enter the street address.").waitFor();
    await page.getByText("Choose a province.").waitFor();
    assert.equal((await db.query("SELECT COUNT(*) c FROM orders o JOIN users u ON u.user_id=o.user_id WHERE u.email=?", [EMAIL]))[0][0].c, 0);
    ok("checkout validates the address and creates nothing when it's incomplete");

    await page.fill('input[name=line1]', "12 Test Street"); await page.fill('input[name=city]', "Sandton");
    await page.fill('input[name=postalCode]', "2196"); await page.selectOption('select[name=province]', "Gauteng");
    await page.fill('input[name=contactNumber]', "082 123 4567");
    await page.getByRole("button", { name: "Place order and pay" }).click();
    await page.waitForURL(/\/checkout\/pay\/MS-/);
    const orderNumber = page.url().split("/").pop();

    // PayFast form is auto-submitted to the (stubbed) sandbox with a valid signature
    await page.waitForFunction(() => globalThis.__never === undefined);
    for (let i = 0; i < 40 && !globalThis.__pfPost; i++) await new Promise((r) => setTimeout(r, 100));
    const post = new URLSearchParams(globalThis.__pfPost || "");
    assert.equal(post.get("m_payment_id"), orderNumber);
    assert.equal(post.get("merchant_id"), process.env.PAYFAST_MERCHANT_ID || post.get("merchant_id"));
    const pairs = [...post.entries()].filter(([k]) => k !== "signature");
    const qs = pairs.map(([k, v]) => `${k}=${enc(v)}`).join("&");
    assert.equal(post.get("signature"), md5(PASSPHRASE ? `${qs}&passphrase=${enc(PASSPHRASE)}` : qs));
    ok("pay page posts a correctly signed form to PayFast sandbox");

    // 5. order rows
    const [[o]] = await db.query("SELECT * FROM orders WHERE order_number=?", [orderNumber]);
    assert.equal(o.order_status, "pending_payment");
    const total = cents(o.total_amount);
    assert.equal(cents(o.subtotal), expectItems);
    assert.equal(total, expectItems + cents(o.shipping_amount));
    assert.equal(cents(o.vat_amount), Math.round((total * 15) / 115));
    const [items] = await db.query("SELECT * FROM order_items WHERE order_id=?", [o.order_id]);
    assert.equal(items.length, 2);
    assert.equal(items.reduce((s, i) => s + cents(i.line_total), 0), expectItems);
    const [vos] = await db.query("SELECT * FROM vendor_orders WHERE order_id=?", [o.order_id]);
    assert.equal(vos.length, twoVendors ? 2 : 1);
    assert.equal((await db.query("SELECT COUNT(*) c FROM order_addresses WHERE order_id=? AND city='Sandton' AND province='Gauteng'", [o.order_id]))[0][0].c, 1);
    const [[pay]] = await db.query("SELECT * FROM payments WHERE order_id=?", [o.order_id]);
    assert.equal(pay.payment_status, "pending"); assert.equal(cents(pay.amount), total);
    assert.equal((await db.query("SELECT cart_status s FROM carts WHERE cart_id=?", [o.cart_id]))[0][0].s, "converted");
    assert.equal(await stock(A.variant_id), 5); // not taken until paid
    assert.equal((await db.query("SELECT COUNT(*) c FROM addresses a JOIN users u ON u.user_id=a.user_id WHERE u.email=? AND a.is_default=1", [EMAIL]))[0][0].c, 1);
    ok(`order, ${vos.length} vendor order(s), items, address and pending payment saved; totals and VAT add up; address remembered`);

    await page.goto("/cart"); await page.getByText("Your cart is empty").waitFor();
    ok("cart is empty after placing the order");

    // 6. payment notifications
    const base = { m_payment_id: orderNumber, pf_payment_id: "1089250", payment_status: "COMPLETE", item_name: "MultiSS order", amount_gross: (total / 100).toFixed(2), amount_fee: "-2.00", amount_net: "98.00", email_address: EMAIL };
    assert.equal(await notify(itnBody(base).replace(/signature=[0-9a-f]+/, "signature=" + "0".repeat(32))), 400);
    assert.equal(await notify(itnBody({ ...base, amount_gross: "1.00" })), 400, "amount mismatch must be rejected (signed correctly, wrong amount)");
    assert.equal(await notify(itnBody({ ...base, m_payment_id: "MS-000000-ZZZZZ" })), 400);
    assert.equal((await db.query("SELECT order_status s FROM orders WHERE order_id=?", [o.order_id]))[0][0].s, "pending_payment");
    ok("forged, wrong-amount and unknown-order notifications are rejected and change nothing");

    assert.equal(await notify(itnBody(base)), 200);
    assert.equal((await db.query("SELECT order_status s FROM orders WHERE order_id=?", [o.order_id]))[0][0].s, "confirmed");
    const [[pay2]] = await db.query("SELECT * FROM payments WHERE order_id=?", [o.order_id]);
    assert.equal(pay2.payment_status, "successful"); assert.equal(pay2.transaction_reference, "1089250"); assert.ok(pay2.paid_at);
    assert.equal(await stock(A.variant_id), 3); assert.equal(await stock(B.variant_id), 2);
    assert.equal((await db.query("SELECT COUNT(*) c FROM inventory_movements WHERE notes=?", ["Order " + orderNumber]))[0][0].c, 2);
    ok("a valid notification confirms the order, records the payment and takes stock");

    assert.equal(await notify(itnBody(base)), 200);
    assert.equal(await stock(A.variant_id), 3);
    assert.equal((await db.query("SELECT COUNT(*) c FROM inventory_movements WHERE notes=?", ["Order " + orderNumber]))[0][0].c, 2);
    ok("a repeated notification does nothing the second time");

    await page.goto(`/order/${orderNumber}`);
    await page.getByRole("heading", { name: /your order is confirmed/i }).waitFor();
    await page.goto("/account/orders"); await page.getByText(orderNumber).waitFor();
    await page.goto(`/checkout/pay/${orderNumber}`); await page.waitForURL(`**/order/${orderNumber}`);
    ok("confirmation page, order list, and no second payment for a paid order");

    // 7. someone else cannot see it
    const o2 = await (await browser.newContext({ baseURL: BASE })).newPage();
    await register(o2, EMAIL2);
    const r = await o2.goto(`/order/${orderNumber}`); assert.equal(r.status(), 404);
    const r2 = await o2.goto(`/checkout/pay/${orderNumber}`); assert.equal(r2.status(), 404);
    ok("another customer gets 404 for this order");

    // 8. second order: cancelled return, failed notification, then simulated payment
    await page.goto(pageB);
    await page.locator("form:has(input[name=quantity]) button[type=submit]").click(); await page.getByText("Added to your cart").waitFor();
    await page.goto("/checkout");
    await page.getByRole("button", { name: "Place order and pay" }).click();
    await page.waitForURL(/\/checkout\/pay\/MS-/);
    const n2 = page.url().split("/").pop();
    await page.waitForURL("https://sandbox.payfast.co.za/**"); // the pay page hands over to PayFast by itself
    const [[o3]] = await db.query("SELECT total_amount t FROM orders WHERE order_number=?", [n2]);
    await page.goto(`/order/${n2}?cancelled=1`); await page.getByRole("heading", { name: "Payment wasn't completed" }).waitFor();
    assert.equal(await notify(itnBody({ m_payment_id: n2, pf_payment_id: "1", payment_status: "CANCELLED", amount_gross: Number(o3.t).toFixed(2) })), 200);
    assert.equal((await db.query("SELECT order_status s FROM orders WHERE order_number=?", [n2]))[0][0].s, "payment_failed");
    ok("cancelled payment marks the order failed and offers Pay now");

    await page.goto(`/order/${n2}`);
    await page.getByRole("button", { name: "Simulate a successful payment" }).click();
    await page.waitForURL(`**/order/${n2}`);
    await page.getByRole("heading", { name: /your order is confirmed/i }).waitFor();
    assert.equal(await stock(B.variant_id), 1);
    ok("a failed order can be paid again; simulated payment (local only) confirms it");

    // 9. stock gone before checkout
    await page.goto(pageB); await page.locator('input[name=quantity]').fill("1");
    await page.locator("form:has(input[name=quantity]) button[type=submit]").click(); await page.getByText("Added to your cart").waitFor();
    await db.query("UPDATE inventory SET quantity_in_stock=0 WHERE variant_id=?", [B.variant_id]);
    await page.goto("/cart"); await page.getByText("Out of stock.").waitFor();
    await page.goto("/checkout"); await page.waitForURL("**/cart");
    ok("an item that sells out is flagged in the cart and blocks checkout");
  } finally {
    for (const [id, q] of Object.entries(orig)) {
      if (q === null) await db.query("DELETE FROM inventory WHERE variant_id=?", [id]);
      else await db.query("UPDATE inventory SET quantity_in_stock=? WHERE variant_id=?", [q, id]);
    }
    await db.query("DELETE FROM inventory_movements WHERE notes LIKE 'Order MS-%' AND created_at > NOW() - INTERVAL 1 HOUR");
    await clean();
    await browser.close(); await db.end();
  }
  console.log(`\n${passed} checks passed`);
})().catch((e) => { console.error("\nFAILED:", e); process.exit(1); });
