/**
 * Small in-memory rate limiter (fixed window per key).
 *
 * It lives in this server process's memory, so with several server processes each one counts
 * separately (the limit is then per process) and a restart clears it. That is acceptable for the
 * launch single-process setup in docs/DEPLOY.md; move it to the database or Redis if you scale out.
 */
type Entry = { count: number; resetAt: number };
const g = globalThis as unknown as { __rateLimits?: Map<string, Entry> };
const store = (g.__rateLimits ??= new Map<string, Entry>());

let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, e] of store) if (e.resetAt <= now) store.delete(k);
}

export type LimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** Records one attempt and says whether it is within `limit` attempts per `windowMs`. */
export function hit(key: string, limit: number, windowMs: number, now = Date.now()): LimitResult {
  sweep(now);
  const e = store.get(key);
  if (!e || e.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  e.count += 1;
  if (e.count > limit) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((e.resetAt - now) / 1000)) };
  return { ok: true };
}

/** Checks without recording an attempt. */
export function peek(key: string, limit: number, now = Date.now()): LimitResult {
  const e = store.get(key);
  if (!e || e.resetAt <= now || e.count < limit) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((e.resetAt - now) / 1000)) };
}

export function reset(key: string): void {
  store.delete(key);
}

export function minutesText(seconds: number): string {
  const m = Math.ceil(seconds / 60);
  return m <= 1 ? "a minute" : `${m} minutes`;
}

/** Best-effort client address. Behind Nginx this is the address Nginx saw (see docs/DEPLOY.md). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64) || "unknown";
  return headers.get("x-real-ip")?.slice(0, 64) || "unknown";
}
