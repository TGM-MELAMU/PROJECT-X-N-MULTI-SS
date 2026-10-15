import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/session";
import { PasswordForm, ProfileForm } from "@/components/account/ProfileForms";

export const metadata: Metadata = { title: "Profile and password", robots: { index: false } };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const changed = (await searchParams).password === "changed";
  const user = await requirePageUser();
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Profile &amp; password</h1>
      <section className="max-w-xl rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
        <h2 className="mb-4 text-lg">Your details</h2>
        <ProfileForm user={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone, email: user.email }} />
      </section>
      <section className="max-w-xl rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
        <h2 className="mb-4 text-lg">Change password</h2>
        {changed && (
          <p role="status" className="mb-4 rounded-control bg-brand-50 px-3 py-2.5 text-sm text-brand-900 ring-1 ring-inset ring-brand-200">
            Your password has been changed. You've been logged out on your other devices.
          </p>
        )}
        <PasswordForm />
      </section>
    </div>
  );
}
