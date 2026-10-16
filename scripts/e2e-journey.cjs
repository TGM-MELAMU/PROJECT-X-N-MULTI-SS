/* End-to-end test of the main customer journey: browse -> log in -> cart -> pay.
 *   1. a visitor searches the shop, opens a product, presses Add to cart and is sent to log in,
 *   2. logs in (an existing account, not a new registration) and lands back on the product,
 *   3. adds it, sees it in the cart, proceeds to checkout, enters a delivery address,
 *   4. reaches the pay page, which posts a correctly signed form to PayFast (stubbed) for the right order and amount.
 * Needs a running server, the dev database, and playwright-core + Chromium. Dev databases only: it creates and deletes
 * an "e2e-journey-...@example.com" user and its order.
 * Usage: BASE=http://localhost:3100 DATABASE_URL=mysql://... PAYFAST_PASSPHRASE=... npm run e2e:journey
 * The server needs PAYFAST_MERCHANT_ID / PAYFAST_MERCHANT_KEY set (sandbox values are fine). */
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const mysql = require("mysql2/promise");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");

const BASE = process.env.BASE || "http://localhost:3100";
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE || "";
const EMAIL = `e2e-journey-${Date.now()}@example.com`;
const PW = "journey passphrase 42";
let passed = 0;
const ok = (n) => { passed++; console.log("  ok -", n); };
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");
const enc = (v) => encodeURIComponent(v.trim()).replace(/%20/g, "+").replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const U = "SELECT user_id FROM users WHERE email LIKE 'e2e-journey-%@example.com'";

(async () => {
  const db = await mysql.createConnection(process.env.DATABASE_URL);
  const clean = async () => {
    const O = `SELECT order_id FROM orders WHERE user_id IN (${U})`;
    for (const t of ["payments", "order_items", "order_addresses", "vendor_orders"]) await db.query(`DELETE FROM ${t} WHERE order_id IN (${O})`);
    await db.query(`DELETE FROM orders WHERE user_id IN (${U})`);
    await db.query(`DELETE FROM cart_items WHERE cart_id IN (SELECT cart_id FROM carts WHERE user_id IN (${U}))`);
    await db.query(`DELETE FROM carts WHERE user_id IN (${U})`);
    await db.query(`DELETE FROM addresses WHERE user_id IN (${U})`);
    await db.query(`DELETE FROM user_tokens WHERE user_id IN (${U})`);
    await db.query(`DELETE ur FROM user_roles ur JOIN users x ON x.user_id=ur.user_id WHERE x.email LIKE 'e2e-journey-%@example.com'`);
    await db.query("DELETE FROM users WHERE email LIKE 'e2e-journey-%@example.com'");
  };
  await clean();

  // A product that is on sale and has stock, so the journey can finish.
  const [rows] = await db.query(`SELECT p.slug, p.product_name, v.sku, v.selling_price
    FROM product_variants v JOIN products p ON p.product_id=v.product_id JOIN inventory i ON i.variant_id=v.variant_id
    WHERE v.variant_status='active' AND p.product_status='active' AND p.approval_status='approved' AND v.selling_price>0 AND i.quantity_in_stock>0
    ORDER BY p.product_id LIMIT 1`);
  assert.ok(rows.length, "no in-stock active product in the database to test with");
  const P = rows[0];
  const productPath = `/product/${P.slug}?variant=${encodeURIComponent(P.sku)}`;

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  try {
    // Set-up: an existing customer (registered, then signed out).
    const setup = await (await browser.newContext({ baseURL: BASE })).newPage();
    await setup.goto("/register");
    await setup.fill("input[name=firstName]", "Journey"); await setup.fill("input[name=lastName]", "Tester");
    await setup.fill("input[name=email]", EMAIL); await setup.fill("input[name=password]", PW);
    await setup.check("input[name=acceptTerms]"); await setup.click("main form button[type=submit]");
    await setup.waitForURL("**/account");
    await setup.close();

    const ctx = await browser.newContext({ baseURL: BASE });
    const page = await ctx.newPage();
    let pfPost = null;
    await page.route("https://sandbox.payfast.co.za/**", async (route) => {
      pfPost = route.request().postData();
      await route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>PayFast stub</body></html>" });
    });

    // 1. Browse
    await page.goto("/shop");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.goto(`/shop?q=${encodeURIComponent(P.product_name)}`);
    await page.locator(`a[href^="/product/${P.slug}"]`).first().click();
    await page.waitForURL(`**/product/${P.slug}**`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    ok("browse: search the shop and open a product as a visitor");

    // 2. Add to cart as a visitor -> log in -> back on the product
    await page.goto(productPath);
    await page.locator("form:has(input[name=quantity]) button[type=submit]").click();
    await page.waitForURL(/\/login\?next=/);
    await page.fill("input[name=email]", EMAIL); await page.fill("input[name=password]", PW);
    await page.click("main form button[type=submit]");
    await page.waitForURL(`**/product/${P.slug}**`);
    ok("login: a visitor is sent to log in, then returned to the product");

    // 3. Cart
    await page.locator("form:has(input[name=quantity]) button[type=submit]").click();
    await page.getByText("Added to your cart").waitFor();
    await page.goto("/cart");
    await page.getByText(P.product_name).first().waitFor();
    ok("cart: the product is in the cart");

    // 4. Checkout -> pay
    await page.getByRole("link", { name: "Proceed to checkout" }).click();
    await page.waitForURL("**/checkout");
    await page.fill("input[name=line1]", "12 Test Street"); await page.fill("input[name=city]", "Sandton");
    await page.fill("input[name=postalCode]", "2196"); await page.selectOption("select[name=province]", "Gauteng");
    await page.fill("input[name=contactNumber]", "082 123 4567");
    await page.getByRole("button", { name: "Place order and pay" }).click();
    await page.waitForURL(/\/checkout\/pay\/MS-/);
    const orderNumber = page.url().split("/").pop();
    for (let i = 0; i < 50 && !pfPost; i++) await new Promise((r) => setTimeout(r, 100));
    assert.ok(pfPost, "the pay page did not post to PayFast");
    const post = new URLSearchParams(pfPost);
    assert.equal(post.get("m_payment_id"), orderNumber);
    const [[order]] = await db.query("SELECT total_amount, order_status FROM orders WHERE order_number=?", [orderNumber]);
    assert.equal(post.get("amount"), Number(order.total_amount).toFixed(2));
    assert.equal(order.order_status, "pending_payment");
    const unsigned = [...post.entries()].filter(([k]) => k !== "signature");
    const qs = unsigned.map(([k, v]) => `${k}=${enc(v)}`).join("&");
    assert.equal(post.get("signature"), md5(PASSPHRASE ? `${qs}&passphrase=${enc(PASSPHRASE)}` : qs));
    ok("pay: the order is created awaiting payment and PayFast gets a correctly signed form for the right amount");
  } finally {
    await clean();
    await browser.close(); await db.end();
  }
  console.log(`\n${passed} checks passed`);
})().catch((e) => { console.error("\nFAILED:", e); process.exit(1); });
