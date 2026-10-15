import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/session";
import { getOrder } from "@/lib/account/orders";
import { ORDER_STATUS } from "@/lib/account/order-status";
import { formatDate } from "@/lib/account/format";
import { formatZar } from "@/lib/vat";
import { Badge } from "@/components/ui/Badge";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await requirePageUser();
  const number = decodeURIComponent((await params).number);

  // Filtered by owner: another customer's order number gives the same 404 as one that doesn't exist.
  const order = await getOrder(user.id, number);
  if (!order) notFound();
  const st = ORDER_STATUS[order.status];
  const a = order.address;

  return (
    <div>
      <p className="mb-2 text-sm"><Link href="/account/orders" className="text-brand-700 underline underline-offset-2">← All orders</Link></p>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">Order {order.orderNumber}</h1>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      <p className="mt-1 text-ink-soft">Placed on {formatDate(order.placedAt)}. {st.help}</p>

      <section className="mt-6 overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
        <h2 className="sr-only">Items</h2>
        <ul className="divide-y divide-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 p-4 md:px-5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.productName}</p>
                <p className="text-sm text-ink-muted">{i.variantName} · SKU {i.sku}</p>
              </div>
              <p className="nums text-sm text-ink-soft">{i.quantity} × {formatZar(i.unitCents)}</p>
              <p className="nums w-28 text-right font-medium">{formatZar(i.lineCents)}</p>
            </li>
          ))}
        </ul>
        <dl className="nums space-y-1.5 border-t border-line bg-surface-muted p-4 text-sm md:px-5">
          <div className="flex justify-between"><dt>Items</dt><dd>{formatZar(order.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{order.shippingCents === 0 ? "Free" : formatZar(order.shippingCents)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total (incl. VAT)</dt><dd>{formatZar(order.totalCents)}</dd></div>
          <div className="flex justify-between text-ink-muted"><dt>VAT included in total</dt><dd>{formatZar(order.vatCents)}</dd></div>
        </dl>
      </section>

      {a && (
        <section className="mt-6 max-w-md rounded-card bg-surface p-5 shadow-card ring-1 ring-line">
          <h2 className="text-lg">Delivery address</h2>
          <address className="mt-2 text-sm not-italic text-ink-soft">
            <strong className="text-ink">{a.recipientName}</strong><br />
            {a.line1}<br />
            {a.line2 && <>{a.line2}<br /></>}
            {a.city}, {a.province} {a.postalCode}<br />
            {a.contactNumber}
          </address>
        </section>
      )}

      <p className="mt-6 text-sm text-ink-soft">
        Questions about this order? <Link href="/contact" className="text-brand-700 underline underline-offset-2">Contact us</Link> and quote {order.orderNumber}
        {site.contact?.email ? <> or email {site.contact.email}</> : null}.
      </p>
    </div>
  );
}
