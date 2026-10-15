import { formatZar } from "@/lib/vat";
import type { Totals } from "@/lib/totals";

/** Totals box shared by the cart, checkout and confirmation pages. Everything is VAT-inclusive. */
export function OrderSummary({ totals, children }: { totals: Totals; children?: React.ReactNode }) {
  return (
    <aside className="rounded-card bg-surface p-5 shadow-card ring-1 ring-line" aria-label="Order summary">
      <h2 className="text-lg">Order summary</h2>
      <dl className="nums mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Items ({totals.itemCount})</dt>
          <dd>{formatZar(totals.itemsCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Delivery</dt>
          <dd>{totals.shippingCents === 0 ? "To be confirmed" : formatZar(totals.shippingCents)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatZar(totals.totalCents)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-xs text-ink-muted">
          <dt>Includes VAT of</dt>
          <dd>{formatZar(totals.vatCents)}</dd>
        </div>
      </dl>
      {children && <div className="mt-5">{children}</div>}
    </aside>
  );
}
