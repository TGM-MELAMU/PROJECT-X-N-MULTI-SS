import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/auth";
import { recentOrderSummary } from "@/lib/account/orders";
import { ORDER_STATUS } from "@/lib/account/order-status";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatDate } from "@/lib/account/format";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const card = "rounded-card bg-surface p-5 shadow-card ring-1 ring-line";

export default async function AccountPage() {
  const user = await requirePageUser();
  const [orders, address] = await Promise.all([
    recentOrderSummary(user.id),
    db.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { id: "desc" }] }),
  ]);
  const status = orders.latest ? ORDER_STATUS[orders.latest.status] : null;

  return (
    <div>
      <h1 className="text-3xl">Hi, {user.firstName}</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-lg">Orders</h2>
          {orders.latest && status ? (
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-ink-soft">Latest: <Link className="font-medium text-brand-700 underline underline-offset-2" href={`/account/orders/${encodeURIComponent(orders.latest.orderNumber)}`}>{orders.latest.orderNumber}</Link></p>
              <p className="flex items-center gap-2"><Badge tone={status.tone}>{status.label}</Badge><span className="text-ink-muted">{formatDate(orders.latest.createdAt)}</span></p>
              <p className="pt-2"><Link href="/account/orders" className="text-brand-700 underline underline-offset-2">View all {orders.count} order{orders.count === 1 ? "" : "s"}</Link></p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">You haven't placed an order yet. <Link href="/shop" className="text-brand-700 underline underline-offset-2">Browse the shop</Link></p>
          )}
        </section>

        <section className={card}>
          <h2 className="text-lg">Delivery address</h2>
          {address ? (
            <address className="mt-3 text-sm not-italic text-ink-soft">
              {address.label && <strong className="block text-ink">{address.label}</strong>}
              {address.line1}<br />
              {address.line2 && <>{address.line2}<br /></>}
              {address.city}, {address.province} {address.postalCode}
            </address>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">No saved address yet.</p>
          )}
          <p className="mt-3 text-sm"><Link href="/account/addresses" className="text-brand-700 underline underline-offset-2">{address ? "Manage addresses" : "Add an address"}</Link></p>
        </section>

        <section className={card}>
          <h2 className="text-lg">Your details</h2>
          <dl className="mt-3 grid grid-cols-[5rem_1fr] gap-y-1.5 text-sm">
            <dt className="text-ink-muted">Name</dt><dd>{user.firstName} {user.lastName}</dd>
            <dt className="text-ink-muted">Email</dt><dd className="break-all">{user.email}</dd>
            <dt className="text-ink-muted">Phone</dt><dd>{user.phone ?? "Not provided"}</dd>
          </dl>
          <p className="mt-3 text-sm"><Link href="/account/profile" className="text-brand-700 underline underline-offset-2">Edit details or change password</Link></p>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {user.roles.includes("admin") && <ButtonLink href="/admin" variant="secondary">Admin</ButtonLink>}
        <form action={logoutAction}><Button type="submit" variant="secondary">Log out</Button></form>
      </div>
    </div>
  );
}
