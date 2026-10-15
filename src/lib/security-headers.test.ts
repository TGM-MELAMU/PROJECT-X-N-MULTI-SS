import { test } from "node:test";
import assert from "node:assert/strict";
import { contentSecurityPolicy, nextHeaders, securityHeaders } from "./security-headers";

const get = (hs: Array<{ key: string; value: string }>, k: string) => hs.find((h) => h.key === k)?.value;

test("every response gets the core security headers", () => {
  const h = securityHeaders(true);
  assert.equal(get(h, "X-Content-Type-Options"), "nosniff");
  assert.equal(get(h, "X-Frame-Options"), "DENY");
  assert.equal(get(h, "Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(get(h, "Permissions-Policy")!, /camera=\(\)/);
  assert.ok(get(h, "Content-Security-Policy"));
});

test("HSTS only in production", () => {
  assert.match(get(securityHeaders(true), "Strict-Transport-Security")!, /max-age=31536000/);
  assert.equal(get(securityHeaders(false), "Strict-Transport-Security"), undefined);
});

test("CSP: locked to this site, framing and plugins blocked, PayFast allowed to receive the payment form", () => {
  const csp = contentSecurityPolicy(true);
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /form-action 'self' https:\/\/www\.payfast\.co\.za https:\/\/sandbox\.payfast\.co\.za/);
  assert.match(csp, /upgrade-insecure-requests/);
  assert.doesNotMatch(csp, /unsafe-eval/);
});

test("CSP: development additionally allows what hot reload needs", () => {
  const csp = contentSecurityPolicy(false);
  assert.match(csp, /'unsafe-eval'/);
  assert.match(csp, /ws:/);
  assert.doesNotMatch(csp, /upgrade-insecure-requests/);
});

test("private pages are marked noindex, public pages are not", () => {
  const rules = nextHeaders(true);
  const noindex = rules.filter((r) => r.headers.some((h) => h.key === "X-Robots-Tag")).map((r) => r.source);
  for (const s of ["/account/:path*", "/admin/:path*", "/cart", "/checkout/:path*", "/order/:path*", "/login", "/register", "/api/:path*"]) {
    assert.ok(noindex.includes(s), `${s} should be noindex`);
  }
  for (const s of ["/", "/shop", "/product/:slug", "/privacy"]) assert.ok(!noindex.includes(s));
  assert.equal(rules[0].source, "/:path*"); // security headers apply to everything
});
