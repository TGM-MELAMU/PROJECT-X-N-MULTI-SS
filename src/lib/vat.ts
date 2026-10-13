/**
 * All MultiSS prices are VAT-inclusive (client confirmed).
 * Work in integer cents to avoid floating point errors; DB columns are
 * DECIMAL(12,2) and are converted at the boundary.
 */

export const VAT_RATE_PERCENT = Number(process.env.VAT_RATE_PERCENT ?? 15);

/** Convert a DB decimal / string / number (rands) to integer cents. */
export function toCents(rands: { toString(): string } | number | string): number {
  return Math.round(Number(rands.toString()) * 100);
}

/** Convert integer cents back to a 2-decimal rand string for DB writes. */
export function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** VAT contained in a VAT-inclusive amount: total × rate / (100 + rate). */
export function vatFromInclusive(inclusiveCents: number): number {
  return Math.round((inclusiveCents * VAT_RATE_PERCENT) / (100 + VAT_RATE_PERCENT));
}

/** Amount excluding VAT, for a VAT-inclusive amount. */
export function exclusiveFromInclusive(inclusiveCents: number): number {
  return inclusiveCents - vatFromInclusive(inclusiveCents);
}

const zar = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

/** Format cents as e.g. "R 12 800,00". */
export function formatZar(cents: number): string {
  return zar.format(cents / 100);
}
