/**
 * Stock rules in one place, with no database access, so they can be tested.
 * The cart, checkout and payment code all call these instead of repeating the arithmetic.
 */

/** Adding to a cart: the new line quantity is capped by stock and by the per-line maximum. */
export function addedQuantity(args: { existing: number; adding: number; stock: number; max: number }) {
  const wanted = args.existing + args.adding;
  const next = Math.max(0, Math.min(wanted, args.stock, args.max));
  return { next, wanted, capped: next < wanted };
}

/**
 * Changing a quantity on the cart page. Never above the per-line maximum or the stock, but an item that is
 * already in the cart can always be set to 1 (so the shopper can lower a number even when stock has dropped to 0).
 */
export function updatedQuantity(requested: number, stock: number, max: number): number {
  return Math.min(requested, max, Math.max(stock, 1));
}

export type BuyableLine = { available: boolean; stock: number; quantity: number };

/** A cart line can be bought when the product is live and there is enough stock for the whole quantity. */
export function isBuyable(line: BuyableLine): boolean {
  return line.available && line.stock > 0 && line.quantity <= line.stock;
}

/** Why a line can't be ordered right now, in words for the shopper, or null when it can. */
export function lineProblem(args: { name: string; live: boolean; stock: number; quantity: number }): string | null {
  if (!args.live) return `${args.name} is no longer available`;
  if (args.stock < args.quantity) return args.stock === 0 ? `${args.name} is out of stock` : `Only ${args.stock} of ${args.name} left`;
  return null;
}

/** A confirmed sale takes stock off the shelf, never below zero. `change` is the (negative) movement to record. */
export function stockAfterSale(previous: number, quantity: number) {
  const next = Math.max(0, previous - quantity);
  return { next, change: next - previous };
}

/** A cancelled paid order puts stock back. */
export function stockAfterRestock(previous: number, quantity: number) {
  const next = previous + quantity;
  return { next, change: quantity };
}
