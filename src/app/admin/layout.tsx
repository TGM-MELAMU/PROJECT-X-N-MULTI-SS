import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The middleware only reads the cookie; this checks the database, so a deactivated or demoted admin is turned away at once.
  await requireAdmin();
  return (
    <div className="shell py-6 md:py-10">
      <div className="grid gap-6 md:grid-cols-[12rem_1fr] md:gap-10">
        <aside>
          <p className="mb-3 hidden text-xs font-semibold uppercase tracking-wide text-ink-muted md:block">Admin</p>
          <AdminNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
