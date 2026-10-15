import Link from "next/link";
import { dashboardStats } from "@/lib/admin/queries";
import { ORDER_STATUS } from "@/lib/account/order-status";
import { formatDate } from "@/lib/account/format";
import { formatZar, toCents } from "@/lib/vat";
import { Badge } from "@/components/ui/Badge";
import { Card, Stat } from "@/components/admin/ui";

export default async function AdminDashboard() {
  const s = await dashboardStats();
  const toDo = (s.orders.new ?? 0) + (s.orders.confirmed ?? 0) + (s.orders.processing ?? 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Dashboard</h1>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <li><Stat label="Orders to handle" value={toDo} href="/admin/orders?status=confirmed" tone={toDo > 0 ? "warn" : undefined} /></li>
        <li><Stat label="Waiting for payment" value={s.orders.pending_payment ?? 0} href="/admin/orders?status=pending_payment" /></li>
        <li><Stat label={`Paid orders, last 30 days (${s.salesCount30})`} value={formatZar(toCents(s.sales30 ?? 0))} /></li>
        <li><Stat label="Products in the shop" value={s.liveProducts.toLocaleString("en-ZA")} href="/admin/products?status=active&approval=approved" /></li>
      </ul>

      <Card title="Needs attention">
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li><Link className="text-brand-700 underline underline-offset-2" href="/admin/products?approval=pending">{s.pendingApproval.toLocaleString("en-ZA")} products waiting for approval</Link></li>
          <li><Link className="text-brand-700 underline underline-offset-2" href="/admin/products?category=none&status=active&approval=approved">{s.uncategorised.toLocaleString("en-ZA")} live products with no category</Link></li>
          <li><Link className="text-brand-700 underline underline-offset-2" href="/admin/products?stock=out&status=active&approval=approved">{s.outOfStock.toLocaleString("en-ZA")} live products out of stock</Link></li>
        </ul>
      </Card>

      <Card title="Latest orders">
        {s.recent.length === 0 ? (
          <p className="text-sm text-ink-soft">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {s.recent.map((o) => (
              <li key={o.orderNumber}>
                <Link href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-brand-50">
                  <span className="font-medium">{o.orderNumber}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">{o.user.firstName} {o.user.lastName} · {formatDate(o.createdAt)}</span>
                  <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
                  <span className="nums w-28 text-right font-semibold">{formatZar(toCents(o.totalAmount))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
