/**
 * Security headers for every response, plus "noindex" for private pages.
 * Pure (no Next imports) so it can be unit-tested and imported from next.config.ts.
 *
 * Content-Security-Policy notes:
 *  - Next.js inlines small scripts for page data, so script-src needs 'unsafe-inline' unless a per-request
 *    nonce is added (that makes every page dynamic). Everything else is locked to this site.
 *  - Product photos may be hosted anywhere over HTTPS (admins paste an image address), so img-src allows https:.
 *  - form-action allows PayFast, because the pay page posts the order to PayFast.
 *  - 'unsafe-eval' is only added in development (React's debugging tools need it).
 */

const PAYFAST_HOSTS = ["https://www.payfast.co.za", "https://sandbox.payfast.co.za"];

export type Header = { key: string; value: string };

export function contentSecurityPolicy(isProd: boolean): string {
  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"])]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'", ...(isProd ? [] : ["ws:", "wss:"])]],
    ["form-action", ["'self'", ...PAYFAST_HOSTS]],
    ["frame-ancestors", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["object-src", ["'none'"]],
  ];
  const parts = directives.map(([name, values]) => `${name} ${values.join(" ")}`);
  if (isProd) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export function securityHeaders(isProd: boolean): Header[] {
  const headers: Header[] = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(isProd) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
  // HSTS tells browsers to use HTTPS only. Sending it over plain HTTP in development does nothing useful.
  if (isProd) headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
  return headers;
}

/** Pages that are private or have no value in search results. Same patterns Next.js uses in `headers()`. */
export const NOINDEX_SOURCES = [
  "/account/:path*",
  "/admin/:path*",
  "/cart",
  "/checkout/:path*",
  "/order/:path*",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/:path*",
];

/** The value for next.config.ts `headers()`. */
export function nextHeaders(isProd: boolean) {
  return [
    { source: "/:path*", headers: securityHeaders(isProd) },
    ...NOINDEX_SOURCES.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] })),
  ];
}
