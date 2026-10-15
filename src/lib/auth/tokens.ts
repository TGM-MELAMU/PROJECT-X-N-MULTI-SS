import { db } from "@/lib/db";
import { hashToken, newRawToken } from "./tokens-pure";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Creates a password-reset token for a user and cancels any earlier unused ones, so only the
 * newest emailed link works. Returns the raw token for the email.
 */
export async function createResetToken(userId: number, now = new Date()): Promise<string> {
  const raw = newRawToken();
  await db.$transaction([
    db.userToken.updateMany({ where: { userId, type: "password_reset", usedAt: null }, data: { usedAt: now } }),
    db.userToken.create({
      data: { userId, type: "password_reset", tokenHash: hashToken(raw), expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS) },
    }),
  ]);
  return raw;
}

export type TokenCheck = { valid: true; userId: number } | { valid: false };

/** Read-only check used to show "this link has expired" before the person types a new password. */
export async function checkResetToken(raw: string, now = new Date()): Promise<TokenCheck> {
  if (!raw || raw.length > 200) return { valid: false };
  const row = await db.userToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!row || row.type !== "password_reset" || row.usedAt || row.expiresAt <= now) return { valid: false };
  return { valid: true, userId: row.userId };
}

/**
 * Uses a token exactly once. The UPDATE only matches an unused, unexpired token, so two requests
 * racing with the same link can't both succeed.
 */
export async function consumeResetToken(raw: string, now = new Date()): Promise<TokenCheck> {
  if (!raw || raw.length > 200) return { valid: false };
  const tokenHash = hashToken(raw);
  const row = await db.userToken.findUnique({ where: { tokenHash } });
  if (!row || row.type !== "password_reset") return { valid: false };
  const claimed = await db.userToken.updateMany({
    where: { tokenHash, type: "password_reset", usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  return claimed.count === 1 ? { valid: true, userId: row.userId } : { valid: false };
}
