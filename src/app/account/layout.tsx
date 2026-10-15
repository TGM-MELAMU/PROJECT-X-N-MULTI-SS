import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AccountNav } from "@/components/account/AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // The middleware already sends guests away; this also catches a session that is no longer valid
  // (account switched off, or password changed on another device).
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="shell py-6 md:py-10">
      <div className="grid gap-6 md:grid-cols-[13rem_1fr] md:gap-10">
        <aside>
          <p className="mb-3 hidden text-xs font-semibold uppercase tracking-wide text-ink-muted md:block">My account</p>
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
