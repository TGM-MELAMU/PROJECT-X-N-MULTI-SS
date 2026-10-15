import { createHash, randomBytes } from "node:crypto";

/** Only this hash is stored. The raw token exists only in the email link. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function newRawToken(): string {
  return randomBytes(32).toString("base64url");
}
