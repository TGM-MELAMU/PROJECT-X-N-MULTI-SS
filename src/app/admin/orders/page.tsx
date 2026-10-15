import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { listOrdersAdmin } from "@/lib/admin/queries";
import { one } from "@/lib/admin/links";
import { ORDER_STATUS, pageNumber } from "@/lib/account/order-status";
import { formatDate } from "@/lib/account/format";
import { formatZar, toCents } from "@/lib/vat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AdminPager, Flash, SelectInput, TextInput } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Orders" };

const STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminOrders({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const statusRaw = one(sp.status);
  const validStatus = statusRaw && STATUSES.includes(statusRaw as OrderStatus) ? (statusRaw as OrderStatus) : null;
  const { orders, total, page, pageCount } = await listOrdersAdmin({ q, status: validStatus, page: pageNumber(sp.page) });
  const query = { q, status: validStatus };

  return (
    <div>
      <h1 className="text-3xl">Orders</h1>
      <div className="mt-4"><Flash notice={one(sp.notice)} error={one(sp.error)} /></div>

      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">Search</label>
          <TextInput id="q" name="q" defaultValue={q} placeholder="Order number, customer name or email" maxLength={100} />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium">Status</label>
          <SelectInput id="status" name="status" defaultValue={validStatus ?? ""}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
          </SelectInput>
        </div>
        <Button type="submit">Filter</Button>
        {(q || validStatus) && <Link href="/admin/orders" className="py-2 text-sm text-brand-700 underline underline-offset-2">Clear</Link>}
      </form>

      <p className="mb-2 text-sm text-ink-muted">{total.toLocaleString("en-ZA")} {total === 1 ? "order" : "orders"}</p>

      {orders.length === 0 ? (
        <p className="rounded-card bg-surface p-6 text-ink-soft ring-1 ring-line">No orders match.</p>
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card ring-1 ring-line">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Order</th>
                <th scope="col" className="px-4 py-3">Customer</th>
                <th scope="col" className="px-4 py-3">Placed</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.orderNumber} className="hover:bg-brand-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`} className="text-brand-700 underline underline-offset-2">{o.orderNumber}</Link>
                    <span className="ml-2 text-xs text-ink-muted">{o._count.items} {o._count.items === 1 ? "item" : "items"}</span>
                  </td>
                  <td className="px-4 py-3">{o.user.firstName} {o.user.lastName}<br /><span className="text-xs text-ink-muted">{o.user.email}</span></td>
                  <td className="px-4 py-3 text-ink-soft">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3"><Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge></td>
                  <td className="nums px-4 py-3 text-right font-semibold">{formatZar(toCents(o.totalAmount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AdminPager path="/admin/orders" query={query} page={page} pageCount={pageCount} />
    </div>
  );
}
