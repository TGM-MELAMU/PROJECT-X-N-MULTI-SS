import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatZar, toCents } from "@/lib/vat";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

const LABELS: Record<string, string> = {
  pending_payment: "Waiting for payment", payment_failed: "Payment not completed", new: "Received",
  confirmed: "Paid and confirmed", processing: "Being prepared", completed: "Completed", cancelled: "Cancelled",
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Faccount%2Forders");
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { id: "desc" },
    take: 50,
    select: { orderNumber: true, status: true, totalAmount: true, createdAt: true },
  });

  return (
    <div className="shell py-8 md:py-12">
      <h1 className="text-3xl">My orders</h1>
      {orders.length === 0 ? (
        <>
          <p className="mt-3 text-ink-soft">You haven't placed an order yet.</p>
          <ButtonLink href="/shop" className="mt-5">Browse the shop</ButtonLink>
        </>
      ) : (
        <ul className="nums mt-6 divide-y divide-line rounded-card bg-surface shadow-card ring-1 ring-line">
          {orders.map((o) => (
            <li key={o.orderNumber}>
              <Link href={`/order/${o.orderNumber}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-brand-50">
                <span>
                  <span className="font-semibold">{o.orderNumber}</span>
                  <span className="block text-sm text-ink-muted">{o.createdAt?.toLocaleDateString("en-ZA", { dateStyle: "medium" })}</span>
                </span>
                <span className="text-sm">{LABELS[o.status] ?? o.status}</span>
                <span className="font-semibold">{formatZar(toCents(o.totalAmount))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
