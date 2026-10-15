import type { OrderStatus } from "@prisma/client";

export type StatusTone = "new" | "sale" | "neutral" | "warning";

/** What customers see for each order status. Every value of the database enum must be listed (a test checks). */
export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: StatusTone; help: string }> = {
  pending_payment: { label: "Awaiting payment", tone: "warning", help: "We haven't received your payment yet." },
  payment_failed: { label: "Payment failed", tone: "sale", help: "Your payment didn't go through. No money was taken." },
  new: { label: "Received", tone: "new", help: "We've received your order and your payment." },
  confirmed: { label: "Confirmed", tone: "new", help: "Your order is confirmed and being prepared." },
  processing: { label: "Processing", tone: "new", help: "Your order is being packed and sent out." },
  completed: { label: "Completed", tone: "neutral", help: "Your order has been delivered." },
  cancelled: { label: "Cancelled", tone: "neutral", help: "This order was cancelled." },
};

export const ORDER_PAGE_SIZE = 10;

/** Turns the ?page= value into a safe page number (1 or more). */
export function pageNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 && n <= 100000 ? n : 1;
}
