import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/AuthForms";
import { checkResetToken } from "@/lib/auth/tokens";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const check = typeof token === "string" ? await checkResetToken(token) : { valid: false as const };

  if (!check.valid || typeof token !== "string") {
    return (
      <AuthShell title="This link has expired" intro="Reset links work once and for 1 hour.">
        <Link href="/forgot-password" className="text-brand-700 underline underline-offset-2">Request a new link</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password">
      <ResetForm token={token} />
    </AuthShell>
  );
}
