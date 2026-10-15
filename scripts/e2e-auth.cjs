/* Browser test of the Phase 3 auth flows against a running server and the real database.
 * Usage: BASE=http://localhost:3100 NEXT_LOG=/tmp/next.log DATABASE_URL=... node scripts/e2e-auth.cjs
 * Needs playwright-core and Chromium; mysql2 is a dev dependency. Dev databases only. */
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const mysql = require("mysql2/promise");
const fs = require("node:fs");
const assert = require("node:assert/strict");

const BASE = process.env.BASE || "http://localhost:3100";
const LOG = process.env.NEXT_LOG || "/tmp/next.log";
const EMAIL = `e2e-${Date.now()}@example.com`;
const PW = "first passphrase 42";
const PW2 = "second passphrase 77";
let passed = 0;
const ok = (name) => { passed++; console.log("  ok -", name); };

async function resetLink(email) {
  for (let i = 0; i < 20; i++) {
    const log = fs.readFileSync(LOG, "utf8");
    const idx = log.lastIndexOf(`[email:dev] to=${email}`);
    if (idx >= 0) { const m = log.slice(idx).match(/https?:\/\/\S+reset-password\?token=\S+/); if (m) return m[0]; }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no reset email in log");
}

/** Logs out and waits until the header really shows the signed-out state (the URL changes before the action ends). */
async function logout(page) {
  await page.getByRole("button", { name: "Log out" }).first().click();
  await page.waitForURL(BASE + "/");
  await page.locator("header").getByRole("link", { name: "Log in" }).first().waitFor({ state: "visible" });
}

(async () => {
  const u = new URL(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({ host: u.hostname, port: +u.port || 3306, user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: u.pathname.slice(1) });
  await conn.query("DELETE ur FROM user_roles ur JOIN users u ON u.user_id=ur.user_id WHERE u.email LIKE 'e2e-%@example.com'");
  await conn.query("DELETE FROM users WHERE email LIKE 'e2e-%@example.com'");

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage(); globalThis.__page = page; globalThis.__log = []; page.on("framenavigated", (f) => { if (f === page.mainFrame()) globalThis.__log.push(Date.now() % 100000 + " " + f.url().replace(BASE, "")); }); page.on("response", (r) => { if (r.request().method() === "POST") globalThis.__log.push(Date.now() % 100000 + " POST " + r.status() + " " + r.url().replace(BASE, "") + " setcookie=" + ((r.headers()["set-cookie"] || "").match(/authjs\.session-token=[^;]{0,8}/g) || []).join("|")); });

  // 1. guards
  await page.goto("/cart");
  assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, "/login?next=%2Fcart");
  ok("guest /cart is sent to /login?next=/cart");
  await page.goto("/account/orders");
  assert.match(page.url(), /\/login\?next=%2Faccount%2Forders/);
  ok("guest /account/orders is guarded");
  await page.goto("/admin");
  assert.match(page.url(), /\/login\?next=%2Fadmin/);
  ok("guest /admin is guarded");

  // 2. register validation
  await page.goto("/register?next=%2Fcart");
  await page.fill('input[name=firstName]', "Eve"); await page.fill('input[name=lastName]', "Tester");
  await page.fill('input[name=email]', EMAIL); await page.fill('input[name=password]', "short");
  await page.click('main form button[type=submit]');
  await page.getByText("Use at least 8 characters.").waitFor();
  await page.getByText("Please accept the terms").waitFor();
  assert.equal(await page.inputValue('input[name=email]'), EMAIL);
  ok("register shows field errors and keeps typed values");
  assert.equal((await conn.query("SELECT COUNT(*) c FROM users WHERE email=?", [EMAIL]))[0][0].c, 0);

  // 3. register success and return to ?next
  await page.fill('input[name=password]', PW); await page.check('input[name=acceptTerms]');
  await page.fill('input[name=phone]', "082 123 4567");
  await Promise.all([page.waitForURL("**/cart"), page.click('main form button[type=submit]')]);
  await page.getByRole("heading", { name: "Your cart" }).waitFor();
  ok("register signs in and returns to /cart");
  const [[row]] = await conn.query("SELECT user_id, password_hash, terms_accepted_at, phone FROM users WHERE email=?", [EMAIL]);
  assert.match(row.password_hash, /^\$2[aby]\$12\$/); assert.ok(!row.password_hash.includes(PW));
  assert.ok(row.terms_accepted_at); assert.equal(row.phone, "082 123 4567");
  const [roles] = await conn.query("SELECT r.role_name n FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id WHERE ur.user_id=?", [row.user_id]);
  assert.deepEqual(roles.map((r) => r.n), ["customer"]);
  ok("DB: bcrypt hash, terms_accepted_at, phone, customer role only");

  // 4. header + guard now passes + customer can't enter /admin
  await page.goto("/account");
  await page.getByRole("heading", { name: "Hi, Eve" }).waitFor();
  await page.goto("/admin");
  assert.equal(new URL(page.url()).pathname, "/account");
  ok("customer sees account and is bounced from /admin");
  await page.goto("/login");
  assert.equal(new URL(page.url()).pathname, "/account");
  ok("signed-in user visiting /login is redirected");

  // 5. logout
  await logout(page);
  await page.waitForURL(BASE + "/");
  await page.goto("/account");
  assert.match(page.url(), /\/login/);
  ok("logout ends the session");

  // 6. duplicate email
  await page.goto("/register");
  await page.fill('input[name=firstName]', "Eve"); await page.fill('input[name=lastName]', "Again");
  await page.fill('input[name=email]', EMAIL.toUpperCase()); await page.fill('input[name=password]', PW); await page.check('input[name=acceptTerms]');
  await page.click('main form button[type=submit]');
  await page.getByText("An account with this email already exists").waitFor();
  ok("duplicate email (any case) is rejected");

  // 7. login wrong then right
  await page.goto("/login?next=%2Fshop%3Fcategory%3Dglassware");
  await page.fill('input[name=email]', EMAIL); await page.fill('input[name=password]', "wrong password!");
  await page.click('main form button[type=submit]');
  await page.getByText("Incorrect email or password.").waitFor();
  await page.fill('input[name=password]', PW);
  await Promise.all([page.waitForURL("**/shop?category=glassware"), page.click('main form button[type=submit]')]);
  ok("wrong password rejected; right password returns to the ?next page");
  await logout(page);

  // 8. open redirect attempts
  for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "%2F%2Fevil.com"]) {
    await page.goto("/login?next=" + bad);
    await page.fill('input[name=email]', EMAIL); await page.fill('input[name=password]', PW);
    await page.click('main form button[type=submit]');
    await page.waitForURL(BASE + "/account");
    await logout(page);
  }
  ok("open-redirect values all land on /account on this site");

  // 9. admin
  await page.goto("/login?next=%2Fadmin");
  await page.fill('input[name=email]', "admin@multiss.co.za"); await page.fill('input[name=password]', "dev-admin-pass-123");
  await page.click('main form button[type=submit]');
  await page.waitForURL("**/admin");
  ok("admin role may open /admin (page itself arrives in Phase 6)");
  await logout(page);

  // 10. forgot / reset
  const ctxA = await browser.newContext({ baseURL: BASE }); const a = await ctxA.newPage(); // an older session
  await a.goto("/login"); await a.fill('input[name=email]', EMAIL); await a.fill('input[name=password]', PW);
  await Promise.all([a.waitForURL("**/account"), a.click('main form button[type=submit]')]);

  await page.goto("/forgot-password");
  await page.fill('input[name=email]', "nobody-here@example.com"); await page.click('main form button[type=submit]');
  const unknownMsg = await page.locator("main").getByRole("status").innerText();
  await page.goto("/forgot-password");
  await page.fill('input[name=email]', EMAIL); await page.click('main form button[type=submit]');
  const knownMsg = await page.locator("main").getByRole("status").innerText();
  assert.equal(unknownMsg.replace("nobody-here@example.com", "X"), knownMsg.replace(EMAIL, "X"));
  ok("forgot-password reply is identical for known and unknown emails");
  let tok;
  for (let i = 0; i < 20 && !tok; i++) {
    [[tok]] = await conn.query("SELECT token_hash, expires_at FROM user_tokens WHERE user_id=? AND used_at IS NULL", [row.user_id]);
    if (!tok) await new Promise((r) => setTimeout(r, 250));
  }
  assert.match(tok.token_hash, /^[0-9a-f]{64}$/);
  const link = await resetLink(EMAIL);
  assert.ok(!link.includes(tok.token_hash));
  ok("token stored hashed only; link emailed (dev console)");

  await page.goto(link);
  await page.fill('input[name=password]', "password123"); await page.click('main form button[type=submit]');
  await page.getByText("too common").waitFor();
  await page.fill('input[name=password]', PW2);
  await Promise.all([page.waitForURL("**/login?reset=1"), page.click('main form button[type=submit]')]);
  await page.getByText("Your password has been changed").waitFor();
  ok("weak password doesn't burn the link; strong one resets and redirects");

  await page.goto(link);
  await page.getByText("This link has expired").waitFor();
  ok("used link cannot be reused");

  await a.goto("/account");
  assert.match(a.url(), /\/login/);
  ok("session from before the reset is signed out");

  await page.goto("/login"); await page.fill('input[name=email]', EMAIL); await page.fill('input[name=password]', PW);
  await page.click('main form button[type=submit]'); await page.getByText("Incorrect email or password.").waitFor();
  await page.fill('input[name=password]', PW2);
  await Promise.all([page.waitForURL("**/account"), page.click('main form button[type=submit]')]);
  ok("old password fails, new password works");
  await logout(page);

  // 11. expired token
  await page.goto("/forgot-password"); await page.fill('input[name=email]', EMAIL); await page.click('main form button[type=submit]');
  await page.locator("main").getByRole("status").waitFor();
  const link2 = await (async () => { await new Promise((r) => setTimeout(r, 500)); return resetLink(EMAIL); })();
  await conn.query("UPDATE user_tokens SET expires_at = NOW() - INTERVAL 1 MINUTE WHERE user_id=? AND used_at IS NULL", [row.user_id]);
  await page.goto(link2); await page.getByText("This link has expired").waitFor();
  ok("expired link is refused");
  await page.goto("/reset-password?token=garbage"); await page.getByText("This link has expired").waitFor();
  ok("garbage token is refused");

  // 12. rate limit (last, it locks this email from this address for 15 min)
  await page.goto("/login");
  for (let i = 0; i < 6; i++) {
    await page.fill('input[name=email]', EMAIL); await page.fill('input[name=password]', "bad guess " + i);
    await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), page.click('main form button[type=submit]')]);
    await page.locator("main").getByRole("alert").waitFor();
    // React clears the form once the action finishes; wait for that before typing again.
    await page.waitForFunction(() => document.querySelector("input[name=password]").value === "");
  }
  await page.fill('input[name=password]', PW2); await page.click('main form button[type=submit]');
  await page.getByText("Too many attempts").waitFor();
  ok("login is locked after repeated failures, even with the right password");

  await conn.query("DELETE ur FROM user_roles ur JOIN users u ON u.user_id=ur.user_id WHERE u.email LIKE 'e2e-%@example.com'");
  await conn.query("DELETE FROM users WHERE email LIKE 'e2e-%@example.com'");
  await browser.close(); await conn.end();
  console.log(`\n${passed} checks passed`);
})().catch(async (e) => {
  console.error("\nFAILED:", e);
  try { const p = globalThis.__page; console.error("URL:", p.url()); console.error(globalThis.__log.slice(-14).join("\n")); console.error((await p.locator("body").innerText()).slice(0, 600)); } catch {}
  process.exit(1);
});
