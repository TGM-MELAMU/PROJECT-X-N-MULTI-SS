import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { listOrders } from "@/lib/account/orders";
import { ORDER_STATUS, pageNumber } from "@/lib/account/order-status";
import { formatDate } from "@/lib/account/format";
import { formatZar } from "@/lib/vat";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink, buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requirePageUser();
  const page = pageNumber((await searchParams).page);
  const { orders, total, pageCount } = await listOrders(user.id, page);

  return (
    <div>
      <h1 className="text-3xl">Orders</h1>

      {total === 0 ? (
        <div className="mt-6 rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
          <p className="text-ink-soft">You haven't placed an order yet.</p>
          <ButtonLink href="/shop" className="mt-4">Browse the shop</ButtonLink>
        </div>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-ink-soft">There are no orders on this page. <Link href="/account/orders" className="text-brand-700 underline underline-offset-2">Back to your latest orders</Link></p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-card bg-surface shadow-card ring-1 ring-line">
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status];
            return (
              <li key={o.orderNumber}>
                <Link href={`/account/orders/${encodeURIComponent(o.orderNumber)}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 hover:bg-brand-50 md:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="text-sm text-ink-muted">{formatDate(o.placedAt)} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"}</p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <p className="nums w-28 text-right font-semibold">{formatZar(o.totalCents)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? <Link className={buttonClass({ variant: "secondary", size: "sm" })} href={`/account/orders?page=${page - 1}`}>Newer</Link> : <span />}
          <span className="text-ink-muted">Page {page} of {pageCount}</span>
          {page < pageCount ? <Link className={buttonClass({ variant: "secondary", size: "sm" })} href={`/account/orders?page=${page + 1}`}>Older</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
