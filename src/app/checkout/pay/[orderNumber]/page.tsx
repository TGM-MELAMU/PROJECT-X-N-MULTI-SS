import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrderForUser } from "@/lib/orders";
import { buildCheckoutFields, payfastConfig, payfastConfigured, pfAmount } from "@/lib/payfast";
import { toCents, formatZar } from "@/lib/vat";
import { PayFastForm } from "@/components/cart/PayFastForm";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Pay for your order", robots: { index: false } };

export default async function PayPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/pay/${orderNumber}`)}`);
  const order = await getOrderForUser(user.id, orderNumber);
  if (!order) notFound();
  if (order.status !== "pending_payment" && order.status !== "payment_failed") redirect(`/order/${orderNumber}`);

  const cfg = payfastConfig();
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const totalCents = toCents(order.totalAmount);
  const fields = payfastConfigured()
    ? buildCheckoutFields(
        {
          merchant_id: cfg.merchantId,
          merchant_key: cfg.merchantKey,
          return_url: `${base}/order/${orderNumber}`,
          cancel_url: `${base}/order/${orderNumber}?cancelled=1`,
          notify_url: `${base}/api/payfast/notify`,
          name_first: user.firstName.slice(0, 100),
          name_last: user.lastName.slice(0, 100),
          email_address: user.email,
          m_payment_id: orderNumber,
          amount: pfAmount(totalCents),
          item_name: `${site.name} order ${orderNumber}`,
        },
        cfg.passphrase,
      )
    : null;

  return (
    <div className="shell py-10 md:py-16">
      <div className="mx-auto max-w-lg rounded-card bg-surface p-6 text-center shadow-card ring-1 ring-line md:p-8">
        <h1 className="text-2xl">Pay for order {orderNumber}</h1>
        <p className="nums mt-2 text-3xl font-semibold">{formatZar(totalCents)}</p>
        <p className="mt-1 text-sm text-ink-muted">Includes VAT</p>

        {fields ? (
          <div className="mt-6">
            <p className="mb-4 text-ink-soft">Taking you to PayFast to pay securely…</p>
            <PayFastForm action={cfg.processUrl} fields={fields} />
            {cfg.sandbox && <p className="mt-4 text-xs text-ink-muted">PayFast sandbox: no real money is taken.</p>}
          </div>
        ) : (
          <p role="alert" className="mt-6 rounded-control bg-red-50 px-4 py-3 text-sm text-sale-dark ring-1 ring-inset ring-red-200">
            Online payment isn't set up on this server yet (PayFast merchant details are missing).
          </p>
        )}

      </div>
    </div>
  );
}
