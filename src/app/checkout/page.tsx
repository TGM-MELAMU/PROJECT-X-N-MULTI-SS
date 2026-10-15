import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartView } from "@/lib/cart";
import { db } from "@/lib/db";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { formatZar } from "@/lib/vat";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fcheckout");
  const cart = await getCartView(user.id);
  if (cart.lines.length === 0 || cart.problems > 0) redirect("/cart");

  const saved = await db.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { id: "desc" }] });
  // Contact details come from the profile, otherwise from the last order, so repeat customers type less.
  const last = await db.orderAddress.findFirst({
    where: { order: { userId: user.id } },
    orderBy: { id: "desc" },
    select: { recipientName: true, contactNumber: true },
  });
  const defaults: Record<string, string> = {
    recipientName: last?.recipientName ?? `${user.firstName} ${user.lastName}`.trim(),
    contactNumber: user.phone ?? last?.contactNumber ?? "",
    line1: saved?.line1 ?? "",
    line2: saved?.line2 ?? "",
    city: saved?.city ?? "",
    province: saved?.province ?? "",
    postalCode: saved?.postalCode ?? "",
  };

  return (
    <div className="shell py-8 md:py-12">
      <h1 className="text-3xl">Checkout</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="delivery-heading" className="rounded-card bg-surface p-5 shadow-card ring-1 ring-line md:p-6">
          <h2 id="delivery-heading" className="mb-4 text-xl">Delivery details</h2>
          <CheckoutForm defaults={defaults} />
        </section>
        <div className="space-y-4">
          <OrderSummary totals={cart.totals} />
          <ul className="nums space-y-1 rounded-card bg-surface p-4 text-sm shadow-card ring-1 ring-line">
            {cart.lines.map((l) => (
              <li key={l.itemId} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{l.quantity} × {l.productName}</span>
                <span>{formatZar(l.lineCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
