import bcrypt from "bcryptjs";

/** bcrypt cost. 12 takes roughly 0.35 s on a typical server: slow enough to hurt guessing, fast enough for login. */
const COST = 12;

/** bcrypt silently ignores everything after 72 BYTES, so longer passwords would be accepted but not honoured. */
export const MAX_PASSWORD_BYTES = 72;
export const MIN_PASSWORD_LENGTH = 8;

// A handful of passwords that are guessed first in every attack. Not a substitute for a real
// breached-password check, just a floor.
const COMMON = new Set(
  [
    "password", "password1", "password123", "passw0rd", "12345678", "123456789", "1234567890", "qwerty123",
    "qwertyuiop", "iloveyou", "welcome1", "welcome123", "admin123", "letmein123", "abc12345", "11111111",
    "00000000", "multiss123", "multisuccess", "johannesburg",
  ].map((s) => s.toLowerCase()),
);

/** Returns a user-facing problem with the password, or null when it is acceptable. */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) return `Use at most ${MAX_PASSWORD_BYTES} bytes (about 70 characters).`;
  if (COMMON.has(password.toLowerCase())) return "That password is too common. Choose something less guessable.";
  if (email && password.toLowerCase() === email.toLowerCase()) return "Your password can't be your email address.";
  if (/^(.)\1+$/.test(password)) return "Choose a password that isn't one repeated character.";
  return null;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

/** Never throws: a malformed or placeholder hash simply fails to verify. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

// Compared against when an email isn't registered, so "no such user" costs the same time as "wrong
// password" and response time doesn't reveal which emails have accounts.
let dummy: Promise<string> | undefined;
export function dummyHash(): Promise<string> {
  return (dummy ??= bcrypt.hash("not-a-real-password", COST));
}

/**
 * A short fingerprint of the stored password hash. It's put in the session so that changing the
 * password (for example through a reset) ends every older session.
 */
export async function passwordStamp(passwordHash: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}
