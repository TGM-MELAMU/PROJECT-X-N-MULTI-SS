import { vatFromInclusive } from "./vat";

export type PricedLine = { unitCents: number; quantity: number };

/**
 * Delivery fee. The client hasn't confirmed delivery pricing yet (see /delivery), so it defaults to
 * free and can be set without a code change:
 *   SHIPPING_FLAT_CENTS=9900          flat fee in cents (R 99,00)
 *   SHIPPING_FREE_OVER_CENTS=150000   optional: no fee when the items total at least this much
 */
export function shippingCents(itemsCents: number): number {
  const flat = Math.max(0, Math.round(Number(process.env.SHIPPING_FLAT_CENTS ?? 0)) || 0);
  const freeOverRaw = process.env.SHIPPING_FREE_OVER_CENTS;
  const freeOver = freeOverRaw ? Math.round(Number(freeOverRaw)) : NaN;
  if (Number.isFinite(freeOver) && itemsCents >= freeOver) return 0;
  return flat;
}

export type Totals = { itemsCents: number; shippingCents: number; totalCents: number; vatCents: number; itemCount: number };

/** All amounts are VAT-inclusive integer cents; vatCents is the VAT contained in the total. */
export function computeTotals(lines: PricedLine[]): Totals {
  const itemsCents = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
  const ship = lines.length === 0 ? 0 : shippingCents(itemsCents);
  const totalCents = itemsCents + ship;
  return {
    itemsCents,
    shippingCents: ship,
    totalCents,
    vatCents: vatFromInclusive(totalCents),
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
  };
}

export const MAX_LINE_QUANTITY = 99;
