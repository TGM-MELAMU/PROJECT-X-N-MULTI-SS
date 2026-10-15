import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./redirect";
import { MAX_PASSWORD_BYTES, hashPassword, passwordProblem, passwordStamp, verifyPassword } from "./password";
import { hashToken, newRawToken } from "./tokens-pure";
import { hit, peek, reset } from "./rate-limit";
import { registerSchema } from "./schemas";

test("safeNext allows same-site paths", () => {
  assert.equal(safeNext("/product/abc?x=1"), "/product/abc?x=1");
  assert.equal(safeNext("/cart"), "/cart");
  assert.equal(safeNext(encodeURIComponent("/shop?q=a b")), "/shop?q=a b");
});

test("safeNext blocks open redirects", () => {
  for (const bad of [
    "//evil.com", "https://evil.com", "http://evil.com/x", "/\\evil.com", "\\\\evil.com", "javascript:alert(1)",
    "/%2F/evil.com", "%2F%2Fevil.com", "/\nhttp://evil.com", "evil.com", "", "/javascript:alert(1)", "/login", "/register?next=/x", "/" + "a".repeat(600),
  ]) {
    assert.equal(safeNext(bad), "/account", `should reject ${JSON.stringify(bad)}`);
  }
  assert.equal(safeNext(undefined, "/"), "/");
  assert.equal(safeNext(["/cart", "//x"]), "/cart");
});

test("password policy", () => {
  assert.ok(passwordProblem("short"));
  assert.ok(passwordProblem("password123"));
  assert.ok(passwordProblem("aaaaaaaaaa"));
  assert.ok(passwordProblem("me@x.co.za", "ME@x.co.za"));
  assert.ok(passwordProblem("é".repeat(MAX_PASSWORD_BYTES))); // 2 bytes each, over the limit
  assert.equal(passwordProblem("a decent passphrase 42"), null);
});

test("bcrypt hash verifies and tolerates garbage hashes", async () => {
  const h = await hashPassword("correct horse battery");
  assert.match(h, /^\$2[aby]\$12\$/);
  assert.equal(await verifyPassword("correct horse battery", h), true);
  assert.equal(await verifyPassword("wrong", h), false);
  assert.equal(await verifyPassword("x", "not-a-hash"), false);
  assert.equal(await passwordStamp(h), await passwordStamp(h));
  assert.notEqual(await passwordStamp(h), await passwordStamp(h + "x"));
});

test("reset tokens are random and stored only as a hash", () => {
  const a = newRawToken(), b = newRawToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 40);
  assert.match(hashToken(a), /^[0-9a-f]{64}$/);
  assert.notEqual(hashToken(a), a);
});

test("rate limiter blocks after the limit and recovers after the window", () => {
  const k = "t:" + Math.random();
  for (let i = 0; i < 3; i++) assert.equal(hit(k, 3, 1000, 0).ok, true);
  const r = hit(k, 3, 1000, 10);
  assert.equal(r.ok, false);
  assert.equal(peek(k, 3, 10).ok, false);
  assert.equal(hit(k, 3, 1000, 2000).ok, true);
  reset(k);
  assert.equal(peek(k, 3, 10).ok, true);
});

test("register schema", () => {
  const ok = { firstName: "A", lastName: "B", email: " A@B.CO.za ", phone: "", password: "a decent passphrase", acceptTerms: "on" };
  const r = registerSchema.safeParse(ok);
  assert.ok(r.success);
  if (r.success) { assert.equal(r.data.email, "a@b.co.za"); assert.equal(r.data.phone, undefined); }
  assert.equal(registerSchema.safeParse({ ...ok, acceptTerms: "" }).success, false);
  assert.equal(registerSchema.safeParse({ ...ok, email: "nope" }).success, false);
  assert.equal(registerSchema.safeParse({ ...ok, phone: "abc" }).success, false);
});
