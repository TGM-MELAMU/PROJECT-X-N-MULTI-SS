import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/AuthForms";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);
  const hasNext = typeof sp.next === "string" && next !== "/account";

  return (
    <AuthShell title="Create an account" intro="Browse as a guest any time. You need an account to add items to your cart and order.">
      <RegisterForm next={hasNext ? next : undefined} />
    </AuthShell>
  );
}
