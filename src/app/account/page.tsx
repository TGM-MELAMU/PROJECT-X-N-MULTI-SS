import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/auth";
import { Button, ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Faccount");

  return (
    <div className="shell py-8 md:py-12">
      <h1 className="text-3xl">Hi, {user.firstName}</h1>
      <div className="mt-6 max-w-xl rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
        <h2 className="text-lg">Your details</h2>
        <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
          <dt className="text-ink-muted">Name</dt><dd>{user.firstName} {user.lastName}</dd>
          <dt className="text-ink-muted">Email</dt><dd className="break-all">{user.email}</dd>
          <dt className="text-ink-muted">Phone</dt><dd>{user.phone ?? "Not provided"}</dd>
        </dl>
        <p className="mt-5 text-sm text-ink-soft">Order history, saved addresses and profile editing arrive in the next phase.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {user.roles.includes("admin") && <ButtonLink href="/admin" variant="secondary">Admin</ButtonLink>}
          <form action={logoutAction}><Button type="submit" variant="secondary">Log out</Button></form>
        </div>
      </div>
    </div>
  );
}
