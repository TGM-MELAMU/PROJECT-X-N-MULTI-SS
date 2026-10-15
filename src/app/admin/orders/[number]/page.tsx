import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderAdmin } from "@/lib/admin/queries";
import { ORDER_TRANSITIONS, restocksOnCancel } from "@/lib/admin/order-flow";
import { one } from "@/lib/admin/links";
import { ORDER_STATUS } from "@/lib/account/order-status";
import { formatDate } from "@/lib/account/format";
import { formatZar, toCents } from "@/lib/vat";
import { addOrderNoteAction, updateOrderStatusAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/account/ConfirmButton";
import { Card, Flash, Label, TextArea, TextInput } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Order" };

const MOVE_LABEL = { confirmed: "Mark as confirmed", processing: "Mark as processing", completed: "Mark as completed", cancelled: "Cancel order" } as const;
type Move = keyof typeof MOVE_LABEL;

export default async function AdminOrder({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const number = decodeURIComponent((await params).number);
  const sp = await searchParams;
  const o = await getOrderAdmin(number);
  if (!o) notFound();

  const st = ORDER_STATUS[o.status];
  const moves = ORDER_TRANSITIONS[o.status].filter((s): s is Move => s in MOVE_LABEL);
  const forward = moves.filter((m) => m !== "cancelled");
  const canCancel = moves.includes("cancelled");
  const paid = o.payments.some((p) => p.status === "successful");
  const notes = (o.adminNotes ?? "").split("\n").filter(Boolean).reverse();

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm"><Link href="/admin/orders" className="text-brand-700 underline underline-offset-2">← All orders</Link></p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">Order {o.orderNumber}</h1>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <p className="mt-1 text-ink-soft">
          Placed {formatDate(o.createdAt)} by {o.user.firstName} {o.user.lastName} ({o.user.email}{o.user.phone ? `, ${o.user.phone}` : ""}).
        </p>
      </div>

      <Flash notice={one(sp.notice)} error={one(sp.error)} />

      <Card title="Items">
        <ul className="divide-y divide-line">
          {o.items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.productName}</p>
                <p className="text-sm text-ink-muted">{i.variantName} · SKU {i.sku}</p>
              </div>
              <p className="nums text-sm text-ink-soft">{i.quantity} × {formatZar(toCents(i.unitPrice))}</p>
              <p className="nums w-28 text-right font-medium">{formatZar(toCents(i.lineTotal))}</p>
            </li>
          ))}
        </ul>
        <dl className="nums mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt>Items</dt><dd>{formatZar(toCents(o.subtotal))}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{toCents(o.shippingAmount) === 0 ? "To be confirmed / free" : formatZar(toCents(o.shippingAmount))}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total (incl. VAT)</dt><dd>{formatZar(toCents(o.totalAmount))}</dd></div>
          <div className="flex justify-between text-ink-muted"><dt>VAT included</dt><dd>{formatZar(toCents(o.vatAmount))}</dd></div>
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Change status">
          {moves.length === 0 ? (
            <p className="text-sm text-ink-soft">This order is {st.label.toLowerCase()}, so its status can't be changed any more.</p>
          ) : (
            <form className="space-y-3">
              <input type="hidden" name="orderNumber" value={o.orderNumber} />
              <div>
                <Label htmlFor="note" hint="(optional, kept in the order history)">Note</Label>
                <TextInput id="note" name="note" maxLength={500} placeholder="e.g. Packed, courier collects Friday" />
              </div>
              <div className="flex flex-wrap gap-2">
                {forward.map((m) => (
                  <Button key={m} type="submit" name="to" value={m} formAction={updateOrderStatusAction}>{MOVE_LABEL[m]}</Button>
                ))}
                {canCancel && (
                  <ConfirmButton
                    variant="danger"
                    name="to"
                    value="cancelled"
                    formAction={updateOrderStatusAction}
                    message={
                      restocksOnCancel(o.status)
                        ? "Cancel this order? Its items go back into stock. If the customer has paid you must refund them in PayFast yourself."
                        : "Cancel this order?"
                    }
                  >
                    {MOVE_LABEL.cancelled}
                  </ConfirmButton>
                )}
              </div>
              {(o.status === "pending_payment" || o.status === "payment_failed") && (
                <p className="text-xs text-ink-muted">Unpaid orders become &quot;Received&quot; by themselves when PayFast confirms payment. Until then they can only be cancelled.</p>
              )}
            </form>
          )}
        </Card>

        <Card title="Delivery address">
          {o.address ? (
            <address className="text-sm not-italic text-ink-soft">
              <strong className="text-ink">{o.address.recipientName}</strong><br />
              {o.address.line1}<br />
              {o.address.line2 && <>{o.address.line2}<br /></>}
              {o.address.city}, {o.address.province} {o.address.postalCode}<br />
              {o.address.contactNumber}
            </address>
          ) : (
            <p className="text-sm text-ink-soft">No address was saved with this order.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Payments">
          {o.payments.length === 0 ? (
            <p className="text-sm text-ink-soft">No payment attempt yet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {o.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="font-medium capitalize">{p.gateway}</span>
                  <Badge tone={p.status === "successful" ? "new" : p.status === "failed" ? "sale" : "neutral"}>{p.status.replace("_", " ")}</Badge>
                  <span className="nums ml-auto">{formatZar(toCents(p.amount))}</span>
                  <span className="w-full text-xs text-ink-muted">{p.transactionReference ? `Ref ${p.transactionReference} · ` : ""}{p.paidAt ? `paid ${formatDate(p.paidAt)}` : `started ${formatDate(p.createdAt)}`}</span>
                </li>
              ))}
            </ul>
          )}
          {!paid && o.status !== "pending_payment" && o.status !== "payment_failed" && o.status !== "cancelled" && (
            <p className="mt-3 rounded-control bg-amber-50 px-3 py-2 text-sm text-amber-900">This order has moved on but no successful payment is recorded. Check PayFast before sending goods.</p>
          )}
        </Card>

        <Card title="Sellers">
          <ul className="divide-y divide-line text-sm">
            {o.vendorOrders.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="font-medium">{v.vendor.companyName}</span>
                <Badge>{v.status}</Badge>
                <span className="nums ml-auto">{formatZar(toCents(v.itemsSubtotal))}</span>
                <span className="w-full text-xs text-ink-muted">{v.number} · commission {formatZar(toCents(v.commissionTotal))} · seller net {formatZar(toCents(v.vendorNetTotal))}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="History and notes">
        <form action={addOrderNoteAction} className="mb-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="orderNumber" value={o.orderNumber} />
          <div className="min-w-48 flex-1">
            <Label htmlFor="newnote">Add a note</Label>
            <TextArea id="newnote" name="note" rows={2} maxLength={500} required />
          </div>
          <Button type="submit" variant="secondary">Add note</Button>
        </form>
        {notes.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing recorded yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm text-ink-soft">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        )}
      </Card>
    </div>
  );
}
