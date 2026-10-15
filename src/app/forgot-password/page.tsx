import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      intro="Enter your email and we'll send you a link to choose a new one."
      footer={<Link href="/login" className="text-brand-700 underline underline-offset-2">Back to log in</Link>}
    >
      <ForgotForm />
    </AuthShell>
  );
}
