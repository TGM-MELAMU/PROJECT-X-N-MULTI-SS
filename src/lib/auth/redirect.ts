/**
 * Turns a "where to go after login" value from the URL into a path that is safe to redirect to.
 * Only same-site paths are allowed, which blocks open-redirect tricks such as `//evil.com`,
 * `/\evil.com`, `https://evil.com` and `javascript:` links.
 */
export function safeNext(value: string | string[] | null | undefined, fallback = "/account"): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== "string") return fallback;
  if (raw.length > 500) return fallback;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  // Must be a single-slash absolute path. Reject anything a browser might treat as another origin.
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(decoded)) return fallback; // backslashes and control characters
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(decoded)) return fallback; // "/javascript:..." style tricks

  // Don't bounce people between the auth pages themselves.
  const path = decoded.split(/[?#]/)[0];
  if (["/login", "/register", "/forgot-password", "/reset-password"].includes(path)) return fallback;

  return decoded;
}
