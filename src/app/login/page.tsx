import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);
  const hasNext = typeof sp.next === "string" && next !== "/account";

  return (
    <AuthShell
      title="Log in"
      intro={hasNext ? "Log in to continue." : "Welcome back."}
      footer={<>New to MultiSS? <Link href={`/register${hasNext ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brand-700 underline underline-offset-2">Create an account</Link></>}
    >
      {sp.reset === "1" && (
        <p role="status" className="mb-4 rounded-control bg-brand-50 px-3 py-2.5 text-sm text-brand-900 ring-1 ring-inset ring-brand-200">
          Your password has been changed. Log in with your new password.
        </p>
      )}
      <LoginForm next={hasNext ? next : undefined} />
    </AuthShell>
  );
}
