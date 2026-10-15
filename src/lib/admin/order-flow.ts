import type { OrderStatus, VendorOrderStatus } from "@prisma/client";

/**
 * Where an admin can move an order from each status. Orders become `confirmed` by themselves when
 * PayFast reports payment (src/lib/orders.ts), so "paid" is never set by hand. Orders that are still
 * unpaid can only be cancelled. `completed` and `cancelled` are final.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["cancelled"],
  payment_failed: ["cancelled"],
  new: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Statuses an order only reaches after payment, which is when its stock was taken off the shelf. */
const STOCK_TAKEN: readonly OrderStatus[] = ["new", "confirmed", "processing"];

/** Cancelling an order that was paid must put its items back in stock; cancelling an unpaid one must not. */
export function restocksOnCancel(from: OrderStatus): boolean {
  return STOCK_TAKEN.includes(from);
}

/** The status each seller's part of the order follows when the main order moves. */
export function vendorStatusFor(to: OrderStatus): VendorOrderStatus | null {
  switch (to) {
    case "confirmed":
    case "processing":
    case "completed":
    case "cancelled":
      return to;
    default:
      return null;
  }
}

/** One line of the order's internal history, e.g. "2026-10-15 08:12 · Thato M. · Processing: packed". */
export function noteLine(when: Date, who: string, text: string): string {
  const stamp = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(when);
  return `${stamp} · ${who} · ${text.trim()}`;
}

/** Appends a line to the existing notes without ever dropping what was there. */
export function appendNote(existing: string | null | undefined, line: string): string {
  return existing ? `${existing}\n${line}` : line;
}
