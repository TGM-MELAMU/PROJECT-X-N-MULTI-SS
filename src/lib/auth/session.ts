import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { passwordStamp } from "./password";

export type CurrentUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  roles: string[];
};

/**
 * The signed-in user, checked against the database on every request (once per request).
 * Returns null when signed out, when the account was deactivated, or when the password has been
 * changed since this session started, so a password reset signs out every older session.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!session?.user || !Number.isInteger(id) || id <= 0) return null;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true, status: true, passwordHash: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  });
  if (!user || user.status !== "active") return null;
  if ((await passwordStamp(user.passwordHash)) !== session.user.stamp) return null;

  return {
    id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone,
    roles: user.roles.map((r) => r.role.name),
  };
});
