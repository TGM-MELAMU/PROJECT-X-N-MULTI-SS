import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartView } from "@/lib/cart";
import { removeCartItemAction, updateCartItemAction } from "@/app/actions/cart";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { formatZar } from "@/lib/vat";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fcart");
  const cart = await getCartView(user.id);

  if (cart.lines.length === 0) {
    return (
      <div className="shell py-8 md:py-12">
        <h1 className="text-3xl">Your cart</h1>
        <p className="mt-3 text-ink-soft">Your cart is empty.</p>
        <ButtonLink href="/shop" className="mt-5">Browse the shop</ButtonLink>
      </div>
    );
  }

  return (
    <div className="shell py-8 md:py-12">
      <h1 className="text-3xl">Your cart</h1>
      {cart.problems > 0 && (
        <p role="alert" className="mt-4 rounded-control bg-red-50 px-4 py-3 text-sm text-sale-dark ring-1 ring-inset ring-red-200">
          Some items are out of stock or no longer available. Remove or reduce them before checking out.
        </p>
      )}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="divide-y divide-line rounded-card bg-surface shadow-card ring-1 ring-line">
          {cart.lines.map((l) => {
            const short = !l.available || l.stock <= 0 || l.quantity > l.stock;
            return (
              <li key={l.itemId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${l.productSlug}`} className="font-semibold hover:text-brand-700">{l.productName}</Link>
                  <p className="text-sm text-ink-muted">{l.variantName} · SKU {l.sku}</p>
                  <p className="nums mt-1 text-sm">{formatZar(l.unitCents)} each, incl. VAT</p>
                  {short && (
                    <p className="mt-1 text-sm font-medium text-sale-dark">
                      {!l.available ? "No longer available." : l.stock <= 0 ? "Out of stock." : `Only ${l.stock} available.`}
                    </p>
                  )}
                </div>
                <form action={updateCartItemAction} className="flex items-center gap-2">
                  <input type="hidden" name="itemId" value={l.itemId} />
                  <label className="sr-only" htmlFor={`qty-${l.itemId}`}>Quantity for {l.productName}</label>
                  <input
                    id={`qty-${l.itemId}`}
                    type="number"
                    name="quantity"
                    min={0}
                    max={99}
                    defaultValue={l.quantity}
                    inputMode="numeric"
                    className="nums h-10 w-20 rounded-control border border-line-strong bg-surface px-3 text-base"
                  />
                  <Button type="submit" variant="secondary" size="md">Update</Button>
                </form>
                <p className="nums w-28 text-right font-semibold">{formatZar(l.lineCents)}</p>
                <form action={removeCartItemAction}>
                  <input type="hidden" name="itemId" value={l.itemId} />
                  <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-sale-dark" aria-label={`Remove ${l.productName}`}>
                    <Trash2 className="h-5 w-5" aria-hidden />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        <OrderSummary totals={cart.totals}>
          {cart.problems > 0 ? (
            <span aria-disabled className={buttonClass({ size: "lg", className: "w-full opacity-50" })}>Proceed to checkout</span>
          ) : (
            <ButtonLink href="/checkout" size="lg" className="w-full">Proceed to checkout</ButtonLink>
          )}
          <Link href="/shop" className="mt-3 block text-center text-sm text-brand-700 underline underline-offset-2">Continue shopping</Link>
        </OrderSummary>
      </div>
    </div>
  );
}
