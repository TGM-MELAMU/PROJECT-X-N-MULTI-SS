/** Only paths inside /admin are allowed as a "go back to" target, so a forged form can't bounce an admin to another site. */
export function safeAdminBack(value: unknown, fallback = "/admin"): string {
  if (typeof value !== "string") return fallback;
  return /^\/admin(\/[A-Za-z0-9._~%-]+)*(\?[^#\s\\]*)?$/.test(value) ? value : fallback;
}

/** Adds a one-line message to a path (replacing an older one), for the banner shown after an action. */
export function withFlash(path: string, kind: "notice" | "error", message: string): string {
  const [base, qs = ""] = path.split("?");
  const p = new URLSearchParams(qs);
  p.delete("notice");
  p.delete("error");
  p.set(kind, message.slice(0, 300));
  return `${base}?${p.toString()}`;
}

type Query = Record<string, string | number | null | undefined>;

/** Builds a path with a query string, leaving out empty values and a first page. */
export function adminHref(path: string, query: Query = {}, overrides: Query = {}): string {
  const merged = { ...query, ...overrides };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v == null || v === "" || (k === "page" && Number(v) <= 1)) continue;
    p.set(k, String(v));
  }
  const qs = p.toString();
  return qs ? `${path}?${qs}` : path;
}

/** First value of a search param. */
export const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

/** Picks the value if it is one of the allowed ones, otherwise the fallback. */
export function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
