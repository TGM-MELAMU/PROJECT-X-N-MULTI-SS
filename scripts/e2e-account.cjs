/* Browser test of the Phase 5 customer account (profile, password, addresses, orders) against a running
 * server and the real database. Dev databases only: it creates and deletes e2e-acct-*@example.com users.
 * Usage: BASE=http://localhost:3100 DATABASE_URL=... node scripts/e2e-account.cjs */
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const mysql = require("mysql2/promise");
const assert = require("node:assert/strict");

const BASE = process.env.BASE || "http://localhost:3100";
const STAMP = Date.now();
const A = `e2e-acct-a-${STAMP}@example.com`;
const B = `e2e-acct-b-${STAMP}@example.com`;
const PW = "first passphrase 42";
const PW2 = "second passphrase 77";
let passed = 0;
const ok = (name) => { passed++; console.log("  ok -", name); };
const rand = (r) => new RegExp("R[\\s\\u00a0]*" + r);

async function register(page, email, first, last) {
  await page.goto("/register");
  await page.fill("input[name=firstName]", first); await page.fill("input[name=lastName]", last);
  await page.fill("input[name=email]", email); await page.fill("input[name=password]", PW);
  await page.check("input[name=acceptTerms]");
  await page.click("main form button[type=submit]");
  await page.waitForURL("**/account");
}
async function logout(page) {
  await page.getByRole("button", { name: "Log out" }).first().click();
  await page.waitForURL(BASE + "/");
  await page.locator("header").getByRole("link", { name: "Log in" }).first().waitFor({ state: "visible" });
}
/** React clears a form when its action finishes; wait for the response, then for the result to show. */
async function submit(page, index = 0) {
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.locator("main form").nth(index).locator("button[type=submit]").click(),
  ]);
  await page.waitForTimeout(400); // let React finish resetting the form before the test types again
}
async function fillAddress(page, a) {
  if (a.label !== undefined) await page.fill("input[name=label]", a.label);
  await page.fill("input[name=line1]", a.line1); await page.fill("input[name=city]", a.city);
  await page.fill("input[name=postalCode]", a.postalCode);
  await page.selectOption("select[name=province]", a.province);
  if (a.isDefault) await page.check("input[name=isDefault]");
}

(async () => {
  const u = new URL(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({ host: u.hostname, port: +u.port || 3306, user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: u.pathname.slice(1) });
  const q = async (sql, p) => (await conn.query(sql, p))[0];
  const cleanup = async () => {
    const ids = (await q("SELECT user_id FROM users WHERE email LIKE 'e2e-acct-%@example.com'")).map((r) => r.user_id);
    if (!ids.length) return;
    await q("DELETE oi FROM order_items oi JOIN orders o ON o.order_id=oi.order_id WHERE o.user_id IN (?)", [ids]);
    await q("DELETE oa FROM order_addresses oa JOIN orders o ON o.order_id=oa.order_id WHERE o.user_id IN (?)", [ids]);
    await q("DELETE vo FROM vendor_orders vo JOIN orders o ON o.order_id=vo.order_id WHERE o.user_id IN (?)", [ids]);
    await q("DELETE FROM orders WHERE user_id IN (?)", [ids]);
    await q("DELETE FROM carts WHERE user_id IN (?)", [ids]);
    await q("DELETE FROM addresses WHERE user_id IN (?)", [ids]);
    await q("DELETE FROM user_tokens WHERE user_id IN (?)", [ids]);
    await q("DELETE FROM user_roles WHERE user_id IN (?)", [ids]);
    await q("DELETE FROM users WHERE user_id IN (?)", [ids]);
  };
  await cleanup();

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage(); globalThis.__page = page;
  page.on("dialog", (d) => d.accept());

  // ── B first, so there is another customer to attack ──
  const ctxB = await browser.newContext({ baseURL: BASE });
  const pb = await ctxB.newPage();
  await register(pb, B, "Bea", "Other");
  const [{ user_id: bId }] = await q("SELECT user_id FROM users WHERE email=?", [B]);
  await pb.goto("/account/addresses/new");
  await fillAddress(pb, { line1: "99 Bea Street", city: "Durban", postalCode: "4001", province: "KwaZulu-Natal" });
  await submit(pb); await pb.waitForURL("**/account/addresses");
  const [{ address_id: bAddr }] = await q("SELECT address_id FROM addresses WHERE user_id=?", [bId]);

  // ── A ──
  await register(page, A, "Ada", "Tester");
  const [{ user_id: aId }] = await q("SELECT user_id FROM users WHERE email=?", [A]);

  // 1. overview and empty states
  const main = page.locator("main");
  assert.match(await main.innerText(), /haven't placed an order yet/);
  assert.match(await main.innerText(), /No saved address yet/);
  await page.goto("/account/orders"); await main.getByText("You haven't placed an order yet.").waitFor();
  await page.goto("/account/addresses"); await main.getByText("You haven't saved a delivery address yet.").waitFor();
  ok("new account shows friendly empty states");

  // 2. profile
  await page.goto("/account/profile");
  await page.fill("input[name=firstName]", ""); await submit(page, 0);
  await main.getByText("Enter your first name.").waitFor();
  await page.fill("input[name=firstName]", "Adaline"); await page.fill("input[name=lastName]", "Tester-Smith"); await page.fill("input[name=phone]", "bad!");
  await submit(page, 0);
  await main.getByText("Enter a valid phone number").waitFor();
  await page.fill("input[name=phone]", "082 555 0101"); await submit(page, 0);
  await main.getByText("Your details have been saved.").waitFor();
  const [urow] = await q("SELECT first_name,last_name,phone FROM users WHERE user_id=?", [aId]);
  assert.deepEqual([urow.first_name, urow.last_name, urow.phone], ["Adaline", "Tester-Smith", "082 555 0101"]);
  await page.locator("header").getByText("Hi, Adaline").first().waitFor({ state: "attached" });
  ok("profile validates, saves, and the header greeting updates");

  // 3. password change
  const ctxOld = await browser.newContext({ baseURL: BASE }); const old = await ctxOld.newPage();
  await old.goto("/login"); await old.fill("input[name=email]", A); await old.fill("input[name=password]", PW);
  await Promise.all([old.waitForURL("**/account"), old.click("main form button[type=submit]")]);

  await page.goto("/account/profile");
  const pw = (s) => page.locator("main form").nth(1).locator(s);
  await pw("input[name=current]").fill("not my password"); await pw("input[name=password]").fill(PW2); await pw("input[name=confirm]").fill(PW2);
  await submit(page, 1);
  await main.getByText("That isn't your current password.").waitFor();
  await page.waitForFunction(() => document.querySelector("input[name=current]").value === "");
  await pw("input[name=current]").fill(PW); await pw("input[name=password]").fill(PW2); await pw("input[name=confirm]").fill("typo typo typo");
  await submit(page, 1);
  await main.getByText("The two passwords don't match.").waitFor();
  await page.waitForFunction(() => document.querySelector("input[name=current]").value === "");
  await pw("input[name=current]").fill(PW); await pw("input[name=password]").fill(PW2); await pw("input[name=confirm]").fill(PW2);
  await submit(page, 1);
  await main.getByText("Your password has been changed.").waitFor();
  await page.goto("/account"); assert.match(page.url(), /\/account$/);
  ok("password change checks the current password and the repeat, and keeps this device signed in");
  await old.goto("/account");
  assert.match(old.url(), /\/login/);
  ok("another device's older session is signed out after the change");
  await logout(page);
  await page.goto("/login"); await page.fill("input[name=email]", A); await page.fill("input[name=password]", PW);
  await page.click("main form button[type=submit]"); await main.getByText("Incorrect email or password.").waitFor();
  await page.waitForFunction(() => document.querySelector("input[name=password]").value === "");
  await page.fill("input[name=password]", PW2); await Promise.all([page.waitForURL("**/account"), page.click("main form button[type=submit]")]);
  ok("old password no longer works, new one does");

  // 4. addresses
  await page.goto("/account/addresses/new");
  await fillAddress(page, { label: "Lab", line1: "1 Lab Road", city: "Johannesburg", postalCode: "20", province: "Gauteng" });
  await submit(page); await main.getByText("Enter a 4-digit postal code").waitFor();
  assert.equal(await page.inputValue("input[name=line1]"), "1 Lab Road");
  ok("address form validates and keeps typed values");
  await page.fill("input[name=postalCode]", "2000"); await submit(page); await page.waitForURL("**/account/addresses");
  let rows = await q("SELECT address_id,address_label,is_default FROM addresses WHERE user_id=? ORDER BY address_id", [aId]);
  assert.equal(rows.length, 1); assert.equal(rows[0].is_default, 1);
  ok("first address becomes the default automatically");

  await page.goto("/account/addresses/new");
  await fillAddress(page, { label: "Warehouse", line1: "2 Depot Ave", city: "Cape Town", postalCode: "8001", province: "Western Cape", isDefault: true });
  await submit(page); await page.waitForURL("**/account/addresses");
  rows = await q("SELECT address_id,address_label,is_default FROM addresses WHERE user_id=? ORDER BY address_id", [aId]);
  assert.equal(rows.length, 2); assert.deepEqual(rows.map((r) => r.is_default), [0, 1]);
  assert.match(await page.locator("li", { hasText: "Warehouse" }).first().innerText(), /Default/);
  ok("choosing a new default moves the default flag (exactly one default)");

  await page.locator("li", { hasText: "Lab" }).getByRole("button", { name: "Make default" }).click();
  await page.locator("li", { hasText: "Lab" }).getByText("Default", { exact: true }).waitFor();
  rows = await q("SELECT address_label,is_default FROM addresses WHERE user_id=? ORDER BY address_id", [aId]);
  assert.deepEqual(rows.map((r) => r.is_default), [1, 0]);
  ok("'Make default' switches the default");

  const labId = rows.length && (await q("SELECT address_id FROM addresses WHERE user_id=? AND address_label='Lab'", [aId]))[0].address_id;
  const whId = (await q("SELECT address_id FROM addresses WHERE user_id=? AND address_label='Warehouse'", [aId]))[0].address_id;
  await page.goto(`/account/addresses/${whId}`);
  await page.fill("input[name=label]", "Depot"); await page.fill("input[name=city]", "Stellenbosch");
  await submit(page); await page.waitForURL("**/account/addresses");
  const [edited] = await q("SELECT address_label,city,is_default FROM addresses WHERE address_id=?", [whId]);
  assert.deepEqual([edited.address_label, edited.city, edited.is_default], ["Depot", "Stellenbosch", 0]);
  ok("editing an address saves changes without touching the default");

  await page.locator("li", { hasText: "Lab" }).getByRole("button", { name: "Delete" }).click();
  await page.locator("li", { hasText: "1 Lab Road" }).waitFor({ state: "detached" });
  rows = await q("SELECT address_label,is_default FROM addresses WHERE user_id=?", [aId]);
  assert.deepEqual(rows.map((r) => [r.address_label, r.is_default]), [["Depot", 1]]);
  ok("deleting the default promotes the remaining address");

  // 5. ownership attacks (B's address id used from A's session)
  assert.equal((await page.goto(`/account/addresses/${bAddr}`)).status(), 404);
  ok("another customer's address page is a 404");

  await page.goto("/account/addresses");
  await page.evaluate((id) => { document.querySelector("form input[name=id][value]").value = String(id); }, bAddr);
  // first delete form on the page belongs to the default address card; point it at B's id
  const before = await q("SELECT COUNT(*) c FROM addresses WHERE address_id=?", [bAddr]);
  await page.locator("main li:has(address)").first().getByRole("button", { name: "Delete" }).click();
  await page.waitForTimeout(800);
  const after = await q("SELECT COUNT(*) c FROM addresses WHERE address_id=?", [bAddr]);
  assert.equal(before[0].c, 1); assert.equal(after[0].c, 1);
  ok("deleting another customer's address by tampering with the form does nothing");

  await page.goto(`/account/addresses/${whId}`);
  await page.evaluate((id) => { document.querySelector("input[name=id]").value = String(id); }, bAddr);
  await page.fill("input[name=line1]", "HACKED"); await submit(page); await page.waitForTimeout(500);
  const [bRow] = await q("SELECT address_line_1 FROM addresses WHERE address_id=?", [bAddr]);
  assert.equal(bRow.address_line_1, "99 Bea Street");
  ok("editing another customer's address by tampering with the form does nothing");

  // limit of 10
  for (let i = 0; i < 9; i++) await q("INSERT INTO addresses (user_id,address_line_1,city,province,postal_code,is_default) VALUES (?,?,?,?,?,0)", [aId, `${i} Filler St`, "Pretoria", "Gauteng", "0001"]);
  await page.goto("/account/addresses");
  assert.equal(await page.getByRole("link", { name: "Add an address" }).count(), 0);
  await page.goto("/account/addresses/new");
  await fillAddress(page, { line1: "11 Too Many", city: "Pretoria", postalCode: "0001", province: "Gauteng" });
  await submit(page); await main.getByText("You can save up to 10 addresses").waitFor();
  ok("the 10-address limit is enforced");

  // 6. orders
  const [{ vendor_id: vendor }] = await q("SELECT vendor_id FROM vendors LIMIT 1");
  const [{ variant_id: variant }] = await q("SELECT variant_id FROM product_variants LIMIT 1");
  async function mkOrder(userId, number, status, daysAgo) {
    const cart = (await q("INSERT INTO carts (user_id,cart_status) VALUES (?, 'converted')", [userId])).insertId;
    const order = (await q("INSERT INTO orders (order_number,user_id,cart_id,subtotal,vat_amount,shipping_amount,total_amount,order_status,created_at) VALUES (?,?,?,115.00,15.00,0.00,115.00,?,NOW() - INTERVAL ? DAY)", [number, userId, cart, status, daysAgo])).insertId;
    const vo = (await q("INSERT INTO vendor_orders (order_id,vendor_id,vendor_order_number,items_subtotal,vendor_net_total) VALUES (?,?,?,115.00,115.00)", [order, vendor, `VO-${number}`])).insertId;
    await q("INSERT INTO order_items (order_id,vendor_order_id,variant_id,product_name,variant_name,sku,quantity,unit_price,line_total) VALUES (?,?,?,'Test Beaker 250ml','Pack of 2','TB-250',2,57.50,115.00)", [order, vo, variant]);
    await q("INSERT INTO order_addresses (order_id,recipient_name,contact_number,address_line_1,city,province,postal_code) VALUES (?,'Ada Tester','082 555 0101','1 Lab Road','Johannesburg','Gauteng','2000')", [order]);
  }
  for (let i = 1; i <= 12; i++) await mkOrder(aId, `E2E-${STAMP}-${String(i).padStart(2, "0")}`, i === 12 ? "completed" : "new", 13 - i);
  await mkOrder(bId, `E2E-${STAMP}-B1`, "new", 1);

  await page.goto("/account/orders");
  assert.equal(await page.locator('main li:has(a[href^="/account/orders/"])').count(), 10);
  assert.match(await main.innerText(), /Page 1 of 2/);
  assert.match(await page.locator('main li:has(a[href^="/account/orders/"])').first().innerText(), new RegExp(`E2E-${STAMP}-12`)); // newest first
  assert.ok(!(await main.innerText()).includes(`${STAMP}-B1`));
  await page.getByRole("link", { name: "Older" }).click(); await page.waitForURL("**page=2");
  assert.equal(await page.locator('main li:has(a[href^="/account/orders/"])').count(), 2);
  await page.goto("/account/orders?page=abc"); assert.match(await main.innerText(), /Page 1 of 2/);
  await page.goto("/account/orders?page=99"); await main.getByText("There are no orders on this page").waitFor();
  ok("orders list: newest first, 10 per page, pagination, bad page numbers handled, other customers' orders hidden");

  await page.goto(`/account/orders/E2E-${STAMP}-12`);
  const text = await main.innerText();
  assert.match(text, /Completed/); assert.match(text, /Test Beaker 250ml/); assert.match(text, /TB-250/);
  assert.match(text, rand("115,00")); assert.match(text, rand("15,00")); assert.match(text, /incl\. VAT/);
  assert.match(text, /1 Lab Road/); assert.match(text, /Free/);
  ok("order detail shows items, VAT-inclusive total, VAT portion and delivery address");

  assert.equal((await page.goto(`/account/orders/E2E-${STAMP}-B1`)).status(), 404);
  assert.equal((await page.goto("/account/orders/DOES-NOT-EXIST")).status(), 404);
  ok("another customer's order and unknown orders are both a 404");

  // 7. guest
  const guest = await (await browser.newContext({ baseURL: BASE })).newPage();
  await guest.goto(`/account/orders/E2E-${STAMP}-12`);
  assert.match(guest.url(), /\/login\?next=/);
  await guest.goto("/account/addresses/new"); assert.match(guest.url(), /\/login\?next=/);
  ok("guests are sent to log in for order and address pages");

  await cleanup();
  await browser.close(); await conn.end();
  console.log(`\n${passed} checks passed`);
})().catch(async (e) => {
  console.error("\nFAILED:", e);
  try { const p = globalThis.__page; console.error("URL:", p.url()); console.error((await p.locator("body").innerText()).slice(0, 500)); } catch {}
  process.exit(1);
});
