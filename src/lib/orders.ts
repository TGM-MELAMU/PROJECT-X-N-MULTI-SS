import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { centsToDecimalString, toCents } from "@/lib/vat";
import { computeTotals } from "@/lib/totals";
import { invalidateCatalogue } from "@/lib/catalogue";

export type AddressInput = {
  recipientName: string;
  contactNumber: string;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
};

export class CheckoutError extends Error {}

/** MS-261014-7K3QX: readable, sortable by date, hard to guess. */
export function newOrderNumber(now = new Date()): string {
  const d = now.toISOString().slice(2, 10).replace(/-/g, "");
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(5);
  let tail = "";
  for (const b of bytes) tail += alphabet[b % alphabet.length];
  return `MS-${d}-${tail}`;
}

/**
 * Turns the user's open cart into an order that is waiting for payment.
 * Prices, stock and availability are re-read from the database inside the transaction, so nothing
 * the browser sent (or an old cart page) can change what is charged.
 */
export async function createOrderFromCart(userId: number, address: AddressInput, saveAddress: boolean): Promise<string> {
  const cart = await db.cart.findFirst({ where: { userId, status: "active" }, orderBy: { id: "asc" } });
  if (!cart) throw new CheckoutError("Your cart is empty.");

  // Commission rules are read up front: product rule first, then category rule, otherwise 0%.
  const items = await db.cartItem.findMany({
    where: { cartId: cart.id },
    select: {
      quantity: true,
      variant: {
        select: {
          id: true, name: true, sku: true, sellingPrice: true, status: true,
          inventory: { select: { quantityInStock: true } },
          product: {
            select: {
              id: true, name: true, vendorId: true, status: true, approvalStatus: true,
              commissionRule: { select: { percentage: true, status: true } },
              categories: { select: { category: { select: { commissionRule: { select: { percentage: true, status: true } } } } } },
            },
          },
        },
      },
    },
  });
  if (items.length === 0) throw new CheckoutError("Your cart is empty.");

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = newOrderNumber();
    try {
      return await db.$transaction(async (tx) => {
        // Re-check inside the transaction so the stock figure is current.
        const problems: string[] = [];
        const lines = [];
        for (const it of items) {
          const v = it.variant;
          const p = v.product;
          const stock = (await tx.inventory.findUnique({ where: { variantId: v.id }, select: { quantityInStock: true } }))?.quantityInStock ?? 0;
          const live = v.status === "active" && p.status === "active" && p.approvalStatus === "approved";
          if (!live) problems.push(`${p.name} is no longer available`);
          else if (stock < it.quantity) problems.push(stock === 0 ? `${p.name} is out of stock` : `Only ${stock} of ${p.name} left`);
          const rule =
            (p.commissionRule?.status === "active" ? p.commissionRule : null) ??
            p.categories.map((c) => c.category.commissionRule).find((r) => r?.status === "active") ??
            null;
          lines.push({
            variantId: v.id, vendorId: p.vendorId, productName: p.name, variantName: v.name, sku: v.sku,
            quantity: it.quantity, unitCents: toCents(v.sellingPrice), commissionPct: rule ? Number(rule.percentage) : 0,
          });
        }
        if (problems.length) throw new CheckoutError(`${problems.join(". ")}. Please update your cart.`);

        const totals = computeTotals(lines.map((l) => ({ unitCents: l.unitCents, quantity: l.quantity })));
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            cartId: cart.id,
            subtotal: centsToDecimalString(totals.itemsCents),
            vatAmount: centsToDecimalString(totals.vatCents),
            shippingAmount: centsToDecimalString(totals.shippingCents),
            totalAmount: centsToDecimalString(totals.totalCents),
            status: "pending_payment",
          },
        });

        // One vendor order per vendor, so each seller only sees their own items.
        const byVendor = new Map<number, typeof lines>();
        for (const l of lines) byVendor.set(l.vendorId, [...(byVendor.get(l.vendorId) ?? []), l]);
        for (const [vendorId, vLines] of byVendor) {
          const withMoney = vLines.map((l) => {
            const lineCents = l.unitCents * l.quantity;
            const commissionCents = Math.round((lineCents * l.commissionPct) / 100);
            return { ...l, lineCents, commissionCents, netCents: lineCents - commissionCents };
          });
          const vo = await tx.vendorOrder.create({
            data: {
              orderId: order.id,
              vendorId,
              number: `${orderNumber}-V${vendorId}`,
              itemsSubtotal: centsToDecimalString(withMoney.reduce((s, l) => s + l.lineCents, 0)),
              commissionTotal: centsToDecimalString(withMoney.reduce((s, l) => s + l.commissionCents, 0)),
              vendorNetTotal: centsToDecimalString(withMoney.reduce((s, l) => s + l.netCents, 0)),
            },
          });
          await tx.orderItem.createMany({
            data: withMoney.map((l) => ({
              orderId: order.id,
              vendorOrderId: vo.id,
              variantId: l.variantId,
              productName: l.productName.slice(0, 200),
              variantName: l.variantName.slice(0, 150),
              sku: l.sku,
              quantity: l.quantity,
              unitPrice: centsToDecimalString(l.unitCents),
              lineTotal: centsToDecimalString(l.lineCents),
              commissionPercentage: l.commissionPct.toFixed(2),
              commissionAmount: centsToDecimalString(l.commissionCents),
              vendorNetAmount: centsToDecimalString(l.netCents),
            })),
          });
        }

        await tx.orderAddress.create({
          data: {
            orderId: order.id,
            recipientName: address.recipientName,
            contactNumber: address.contactNumber,
            line1: address.line1,
            line2: address.line2 || null,
            city: address.city,
            province: address.province,
            postalCode: address.postalCode,
          },
        });
        await tx.payment.create({
          data: { orderId: order.id, gateway: "payfast", amount: centsToDecimalString(totals.totalCents), status: "pending" },
        });
        await tx.cart.update({ where: { id: cart.id }, data: { status: "converted" } });

        if (saveAddress) {
          const same = await tx.address.findFirst({
            where: { userId, line1: address.line1, postalCode: address.postalCode },
            select: { id: true },
          });
          if (!same) {
            const hasAny = (await tx.address.count({ where: { userId } })) > 0;
            await tx.address.create({
              data: {
                userId, line1: address.line1, line2: address.line2 || null, city: address.city,
                province: address.province, postalCode: address.postalCode, isDefault: !hasAny,
              },
            });
          }
        }
        return orderNumber;
      });
    } catch (err) {
      // Order number collision (practically impossible): try a new one.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && String(err.meta?.target ?? "").includes("order_number")) continue;
      throw err;
    }
  }
  throw new CheckoutError("We couldn't create your order just now. Please try again.");
}

export async function getOrderForUser(userId: number, orderNumber: string) {
  return db.order.findFirst({
    where: { orderNumber, userId },
    include: {
      items: { orderBy: { id: "asc" } },
      address: true,
      payments: { orderBy: { id: "desc" }, take: 1 },
    },
  });
}

export type PaidInfo = { pfPaymentId?: string; method?: string; amountCents: number };

/**
 * Marks an order paid exactly once. The status update only matches an order that is still waiting
 * for payment, so a repeated notification (PayFast retries) does nothing the second time.
 * Returns true when this call is the one that confirmed it.
 */
export async function markOrderPaid(orderNumber: string, info: PaidInfo): Promise<boolean> {
  const order = await db.order.findUnique({ where: { orderNumber }, select: { id: true, totalAmount: true } });
  if (!order) return false;
  if (toCents(order.totalAmount) !== info.amountCents) throw new Error("Amount does not match the order total");

  const confirmed = await db.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: { id: order.id, status: { in: ["pending_payment", "payment_failed"] } },
      data: { status: "confirmed" },
    });
    if (claim.count !== 1) return false;

    const payment = await tx.payment.findFirst({ where: { orderId: order.id }, orderBy: { id: "desc" } });
    const now = new Date();
    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "successful", paidAt: now, transactionReference: info.pfPaymentId ?? null, method: info.method ?? null },
      });
    }

    const items = await tx.orderItem.findMany({ where: { orderId: order.id }, select: { variantId: true, quantity: true } });
    for (const it of items) {
      const inv = await tx.inventory.findUnique({ where: { variantId: it.variantId } });
      const prev = inv?.quantityInStock ?? 0;
      const next = Math.max(0, prev - it.quantity);
      if (inv) await tx.inventory.update({ where: { variantId: it.variantId }, data: { quantityInStock: next } });
      await tx.inventoryMovement.create({
        data: {
          variantId: it.variantId, type: "sale", quantityChange: next - prev, previousQuantity: prev, newQuantity: next,
          notes: `Order ${orderNumber}`,
        },
      });
    }
    return true;
  });

  if (confirmed) invalidateCatalogue();
  return confirmed;
}

/** PayFast reported FAILED or CANCELLED. Only moves an order that is still unpaid. */
export async function markOrderPaymentFailed(orderNumber: string): Promise<void> {
  const order = await db.order.findUnique({ where: { orderNumber }, select: { id: true } });
  if (!order) return;
  await db.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({ where: { id: order.id, status: "pending_payment" }, data: { status: "payment_failed" } });
    if (claim.count === 1) {
      await tx.payment.updateMany({ where: { orderId: order.id, status: "pending" }, data: { status: "failed" } });
    }
  });
}
