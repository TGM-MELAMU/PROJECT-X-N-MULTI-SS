import { db } from "@/lib/db";
import { toCents, vatFromInclusive } from "@/lib/vat";
import { ORDER_PAGE_SIZE } from "./order-status";

/** Every query here is filtered by userId, so one customer can never read another's order. */
export async function listOrders(userId: number, page: number) {
  const [total, rows] = await Promise.all([
    db.order.count({ where: { userId } }),
    db.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * ORDER_PAGE_SIZE,
      take: ORDER_PAGE_SIZE,
      select: {
        orderNumber: true, status: true, totalAmount: true, createdAt: true,
        _count: { select: { items: true } },
      },
    }),
  ]);
  return {
    total,
    pageCount: Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE)),
    orders: rows.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      totalCents: toCents(o.totalAmount),
      placedAt: o.createdAt,
      itemCount: o._count.items,
    })),
  };
}

export async function getOrder(userId: number, orderNumber: string) {
  if (!orderNumber || orderNumber.length > 50) return null;
  const o = await db.order.findFirst({
    where: { orderNumber, userId },
    select: {
      orderNumber: true, status: true, subtotal: true, shippingAmount: true, totalAmount: true, createdAt: true,
      items: {
        orderBy: { id: "asc" },
        select: { id: true, productName: true, variantName: true, sku: true, quantity: true, unitPrice: true, lineTotal: true },
      },
      address: {
        select: { recipientName: true, contactNumber: true, line1: true, line2: true, city: true, province: true, postalCode: true, country: true },
      },
    },
  });
  if (!o) return null;
  const totalCents = toCents(o.totalAmount);
  return {
    orderNumber: o.orderNumber,
    status: o.status,
    placedAt: o.createdAt,
    subtotalCents: toCents(o.subtotal),
    shippingCents: toCents(o.shippingAmount),
    totalCents,
    // Worked out from the total rather than trusting the stored column, so it always matches the VAT-inclusive total.
    vatCents: vatFromInclusive(totalCents),
    items: o.items.map((i) => ({
      id: i.id, productName: i.productName, variantName: i.variantName, sku: i.sku, quantity: i.quantity,
      unitCents: toCents(i.unitPrice), lineCents: toCents(i.lineTotal),
    })),
    address: o.address,
  };
}

export async function recentOrderSummary(userId: number) {
  const [count, latest] = await Promise.all([
    db.order.count({ where: { userId } }),
    db.order.findFirst({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { orderNumber: true, status: true, createdAt: true } }),
  ]);
  return { count, latest };
}
