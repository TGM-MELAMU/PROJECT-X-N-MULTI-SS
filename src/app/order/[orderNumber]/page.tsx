import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrderForUser } from "@/lib/orders";
import { formatZar, toCents } from "@/lib/vat";
import { Button, ButtonLink } from "@/components/ui/Button";
import { devSimulationEnabled } from "@/lib/payfast";
import { simulatePaymentAction } from "@/app/actions/payment";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

const LABELS: Record<string, string> = {
  pending_payment: "Waiting for payment",
  payment_failed: "Payment not completed",
  new: "Received",
  confirmed: "Paid and confirmed",
  processing: "Being prepared",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/order/${orderNumber}`)}`);
  const order = await getOrderForUser(user.id, orderNumber);
  if (!order) notFound();

  const paid = ["new", "confirmed", "processing", "completed"].includes(order.status);
  const unpaid = order.status === "pending_payment" || order.status === "payment_failed";
  const total = toCents(order.totalAmount);

  return (
    <div className="shell py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        {paid ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-brand-600" aria-hidden />
            <div>
              <h1 className="text-3xl">Thank you, your order is confirmed</h1>
              <p className="mt-1 text-ink-soft">Order <strong>{order.orderNumber}</strong>. We'll be in touch about delivery.</p>
            </div>
          </div>
        ) : unpaid ? (
          <div className="flex items-start gap-3">
            {sp.cancelled || order.status === "payment_failed" ? (
              <XCircle className="mt-1 h-8 w-8 shrink-0 text-sale" aria-hidden />
            ) : (
              <Clock className="mt-1 h-8 w-8 shrink-0 text-ink-muted" aria-hidden />
            )}
            <div>
              <h1 className="text-3xl">{sp.cancelled || order.status === "payment_failed" ? "Payment wasn't completed" : "We're waiting for your payment"}</h1>
              <p className="mt-1 text-ink-soft">
                Order <strong>{order.orderNumber}</strong> isn't confirmed until PayFast tells us the payment went through.
                If you've just paid, this can take a minute: <Link href={`/order/${order.orderNumber}`} className="font-medium text-brand-700 underline underline-offset-2">refresh this page</Link>.
              </p>
              <ButtonLink href={`/checkout/pay/${order.orderNumber}`} className="mt-4">Pay now</ButtonLink>
              {devSimulationEnabled() && (
                <form action={simulatePaymentAction} className="mt-4 border-t border-line pt-4">
                  <input type="hidden" name="orderNumber" value={order.orderNumber} />
                  <p className="mb-2 text-xs text-ink-muted">Local testing only (PayFast can't reach localhost to confirm payments)</p>
                  <Button type="submit" variant="secondary">Simulate a successful payment</Button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <h1 className="text-3xl">Order {order.orderNumber}</h1>
        )}

        <section className="mt-8 rounded-card bg-surface p-5 shadow-card ring-1 ring-line" aria-label="Order details">
          <p className="text-sm text-ink-muted">Status: <span className="font-medium text-ink">{LABELS[order.status] ?? order.status}</span></p>
          <ul className="nums mt-4 divide-y divide-line">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{i.productName}</span>
                  <span className="block text-ink-muted">{i.variantName} · {i.quantity} × {formatZar(toCents(i.unitPrice))}</span>
                </span>
                <span>{formatZar(toCents(i.lineTotal))}</span>
              </li>
            ))}
          </ul>
          <dl className="nums mt-2 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Items</dt><dd>{formatZar(toCents(order.subtotal))}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd>{toCents(order.shippingAmount) === 0 ? "To be confirmed" : formatZar(toCents(order.shippingAmount))}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatZar(total)}</dd></div>
            <div className="flex justify-between text-xs text-ink-muted"><dt>Includes VAT of</dt><dd>{formatZar(toCents(order.vatAmount))}</dd></div>
          </dl>
        </section>

        {order.address && (
          <section className="mt-5 rounded-card bg-surface p-5 text-sm shadow-card ring-1 ring-line" aria-label="Delivery address">
            <h2 className="mb-2 text-base">Delivering to</h2>
            <address className="not-italic text-ink-soft">
              {order.address.recipientName}<br />
              {order.address.line1}{order.address.line2 ? <>, {order.address.line2}</> : null}<br />
              {order.address.city}, {order.address.province}, {order.address.postalCode}<br />
              {order.address.contactNumber}
            </address>
          </section>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/shop">Continue shopping</ButtonLink>
          <ButtonLink href="/account/orders" variant="secondary">All my orders</ButtonLink>
        </div>
      </div>
    </div>
  );
}
