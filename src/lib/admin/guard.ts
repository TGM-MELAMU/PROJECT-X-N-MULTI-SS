import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * The signed-in administrator, checked against the DATABASE (not just the cookie). Every admin page
 * and every admin server action calls this first: a server action can be invoked directly, so
 * hiding the page behind the layout is not enough.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (!user.roles.includes("admin")) redirect("/account");
  return user;
}

export function adminName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName.slice(0, 1)}.`.trim();
}
