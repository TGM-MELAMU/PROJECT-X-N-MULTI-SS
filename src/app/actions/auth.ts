"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { safeNext } from "@/lib/auth/redirect";
import { clientIp, hit, minutesText, peek, reset } from "@/lib/auth/rate-limit";
import { fieldErrors, forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/auth/schemas";
import { consumeResetToken, createResetToken } from "@/lib/auth/tokens";

/** What every auth form gets back. `values` re-fills the form (never the password). */
export type AuthState = {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  done?: boolean;
};

const MIN = 60_000;
const text = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
const tooMany = (s: number): AuthState => ({
  error: `Too many attempts. Please try again in ${minutesText(s)}.`,
});

async function ip() {
  return clientIp(await headers());
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const next = safeNext(text(formData, "next"));
  const values = { email: text(formData, "email") };

  const parsed = loginSchema.safeParse({ email: text(formData, "email"), password: text(formData, "password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const { email, password } = parsed.data;

  const address = await ip();
  const pairKey = `login:${address}:${email}`;
  // Failed guesses against one account from one address, and any one address trying too much.
  const pair = peek(pairKey, 5);
  if (!pair.ok) return { ...tooMany(pair.retryAfterSeconds), values };
  const any = hit(`login-ip:${address}`, 30, 15 * MIN);
  if (!any.ok) return { ...tooMany(any.retryAfterSeconds), values };

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      const r = hit(pairKey, 5, 15 * MIN);
      if (!r.ok) return { ...tooMany(r.retryAfterSeconds), values };
      return { error: "Incorrect email or password.", values };
    }
    console.error("login failed", err);
    return { error: "We couldn't log you in just now. Please try again.", values };
  }
  reset(pairKey);
  redirect(next);
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const next = safeNext(text(formData, "next"));
  const values = {
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    acceptTerms: text(formData, "acceptTerms"),
    marketing: text(formData, "marketing"),
  };

  const parsed = registerSchema.safeParse({ ...values, password: text(formData, "password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const d = parsed.data;

  const limited = hit(`register:${await ip()}`, 10, 60 * MIN);
  if (!limited.ok) return { ...tooMany(limited.retryAfterSeconds), values };

  try {
    const passwordHash = await hashPassword(d.password);
    await db.$transaction(async (tx) => {
      const role = await tx.role.upsert({ where: { name: "customer" }, update: {}, create: { name: "customer" } });
      await tx.user.create({
        data: {
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          phone: d.phone,
          passwordHash,
          termsAcceptedAt: new Date(),
          roles: { create: { roleId: role.id } },
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Saying so is friendlier than a vague error; the per-IP limit above slows address-harvesting.
      return { fields: { email: "An account with this email already exists. Try logging in instead." }, values };
    }
    console.error("register failed", err);
    return { error: "We couldn't create your account just now. Please try again.", values };
  }

  // Marketing email is a separate, optional consent (POPIA): only subscribed when the box was ticked.
  if (values.marketing === "on") {
    await db.newsletterSubscriber
      .upsert({ where: { email: d.email }, update: { unsubscribedAt: null }, create: { email: d.email } })
      .catch((e) => console.error("marketing opt-in failed", e));
  }

  try {
    await signIn("credentials", { email: d.email, password: d.password, redirect: false });
  } catch (err) {
    console.error("sign-in after register failed", err);
    redirect("/login");
  }
  redirect(next);
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = forgotSchema.safeParse({ email: text(formData, "email") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: { email: text(formData, "email") } };
  const { email } = parsed.data;

  // The reply is identical whether or not the email has an account, and whether or not we were rate limited.
  const done: AuthState = { done: true, values: { email } };
  const address = await ip();
  if (!hit(`forgot-ip:${address}`, 5, 15 * MIN).ok) return done;
  if (!hit(`forgot-email:${email}`, 3, 60 * MIN).ok) return done;

  try {
    const user = await db.user.findUnique({ where: { email }, select: { id: true, firstName: true, status: true } });
    if (user && user.status === "active") {
      const raw = await createResetToken(user.id);
      // Not awaited: sending takes time that would reveal the account exists.
      void sendPasswordResetEmail(email, user.firstName, raw).catch((e) => console.error("reset email failed", e));
    }
  } catch (err) {
    console.error("forgot password failed", err);
  }
  return done;
}

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetSchema.safeParse({ token: text(formData, "token"), password: text(formData, "password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const { token, password } = parsed.data;

  if (!hit(`reset-ip:${await ip()}`, 10, 15 * MIN).ok) return tooMany(15 * 60);

  // Check the password first so a typo doesn't use up the link.
  const problem = passwordProblem(password);
  if (problem) return { fields: { password: problem } };

  const claim = await consumeResetToken(token);
  if (!claim.valid) {
    return { error: "This reset link has expired or was already used. Request a new one." };
  }

  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({ where: { id: claim.userId }, data: { passwordHash } }),
    db.userToken.updateMany({
      where: { userId: claim.userId, type: "password_reset", usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);
  redirect("/login?reset=1");
}
