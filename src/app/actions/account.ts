"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { signIn } from "@/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hit, minutesText, peek, reset } from "@/lib/auth/rate-limit";
import { fieldErrors } from "@/lib/auth/schemas";
import { addressSchema, changePasswordSchema, MAX_ADDRESSES, profileSchema } from "@/lib/account/schemas";
import type { AuthState } from "./auth";

const MIN = 60_000;
const text = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

/** Every action starts here, so a signed-out or stale session can never reach the database code. */
async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function idFrom(fd: FormData): number {
  const n = Number(text(fd, "id"));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

// ───────────── Profile ─────────────

export async function updateProfileAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const user = await requireUser();
  const values = { firstName: text(fd, "firstName"), lastName: text(fd, "lastName"), phone: text(fd, "phone") };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  await db.user.update({
    where: { id: user.id },
    data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName, phone: parsed.data.phone ?? null },
  });
  revalidatePath("/", "layout"); // the header says "Hi, <first name>"
  return { done: true, values: { ...values, firstName: parsed.data.firstName, lastName: parsed.data.lastName } };
}

export async function changePasswordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    current: text(fd, "current"), password: text(fd, "password"), confirm: text(fd, "confirm"),
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const { current, password } = parsed.data;

  const key = `pwchange:${user.id}`;
  const gate = peek(key, 5);
  if (!gate.ok) return { error: `Too many attempts. Please try again in ${minutesText(gate.retryAfterSeconds)}.` };

  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    hit(key, 5, 15 * MIN);
    return { fields: { current: "That isn't your current password." } };
  }

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  reset(key);

  // Changing the password ends every older session (see passwordStamp). Sign this device back in so
  // the person who just changed it isn't thrown out; other devices have to log in again.
  try {
    await signIn("credentials", { email: user.email, password, redirect: false });
  } catch (err) {
    if (!(err instanceof AuthError)) console.error("re-sign-in after password change failed", err);
    redirect("/login?reset=1");
  }
  // Redirect rather than return: this request's page render still sees the old session cookie, a new
  // request carries the new one.
  redirect("/account/profile?password=changed");
}

// ───────────── Addresses ─────────────

export async function saveAddressAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const user = await requireUser();
  const id = idFrom(fd);
  const values = {
    label: text(fd, "label"), line1: text(fd, "line1"), line2: text(fd, "line2"), city: text(fd, "city"),
    province: text(fd, "province"), postalCode: text(fd, "postalCode"), isDefault: text(fd, "isDefault"),
  };
  const parsed = addressSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const d = parsed.data;

  const outcome = await db.$transaction(async (tx) => {
    const existing = id ? await tx.address.findFirst({ where: { id, userId: user.id }, select: { isDefault: true } }) : null;
    if (id && !existing) return "missing" as const;

    const count = await tx.address.count({ where: { userId: user.id } });
    if (!id && count >= MAX_ADDRESSES) return "full" as const;

    // The first address is always the default, and an address that already is the default stays so
    // (pick another address as the default to move it).
    const makeDefault = d.isDefault || count === 0 || existing?.isDefault === true;
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });

    const data = {
      label: d.label ?? null, line1: d.line1, line2: d.line2 ?? null, city: d.city,
      province: d.province, postalCode: d.postalCode, country: "South Africa", isDefault: makeDefault,
    };
    if (id) await tx.address.update({ where: { id }, data });
    else await tx.address.create({ data: { ...data, userId: user.id } });
    return "ok" as const;
  });

  if (outcome === "missing") notFound();
  if (outcome === "full") return { error: `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`, values };

  revalidatePath("/account/addresses");
  redirect("/account/addresses");
}

export async function deleteAddressAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = idFrom(fd);
  if (!id) return;
  await db.$transaction(async (tx) => {
    const gone = await tx.address.deleteMany({ where: { id, userId: user.id } });
    if (gone.count !== 1) return;
    // If the default was deleted, the newest remaining address takes over.
    const hasDefault = await tx.address.count({ where: { userId: user.id, isDefault: true } });
    if (!hasDefault) {
      const next = await tx.address.findFirst({ where: { userId: user.id }, orderBy: { id: "desc" }, select: { id: true } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = idFrom(fd);
  if (!id) return;
  await db.$transaction(async (tx) => {
    const own = await tx.address.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!own) return;
    await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await tx.address.update({ where: { id }, data: { isDefault: true } });
  });
  revalidatePath("/account/addresses");
}
