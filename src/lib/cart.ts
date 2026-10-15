import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toCents } from "@/lib/vat";
import { computeTotals, MAX_LINE_QUANTITY, type Totals } from "@/lib/totals";

export type CartLine = {
  itemId: number;
  variantId: number;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitCents: number;
  quantity: number;
  /** Units available now (0 when out of stock or the product was withdrawn). */
  stock: number;
  /** False when the product or variant is no longer on sale. */
  available: boolean;
  lineCents: number;
};

export type CartView = { cartId: number | null; lines: CartLine[]; totals: Totals; problems: number };

const lineSelect = Prisma.validator<Prisma.CartItemSelect>()({
  id: true,
  quantity: true,
  variant: {
    select: {
      id: true, name: true, sku: true, sellingPrice: true, status: true,
      inventory: { select: { quantityInStock: true } },
      product: {
        select: {
          name: true, slug: true, status: true, approvalStatus: true,
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { imageUrl: true } },
        },
      },
    },
  },
});

/** The user's open cart (oldest one if a second tab ever created another), without creating one. */
export async function findActiveCart(userId: number) {
  return db.cart.findFirst({ where: { userId, status: "active" }, orderBy: { id: "asc" } });
}

export async function getOrCreateCart(userId: number) {
  return (await findActiveCart(userId)) ?? db.cart.create({ data: { userId } });
}

export async function getCartView(userId: number): Promise<CartView> {
  const cart = await findActiveCart(userId);
  if (!cart) return { cartId: null, lines: [], totals: computeTotals([]), problems: 0 };

  const items = await db.cartItem.findMany({ where: { cartId: cart.id }, orderBy: { id: "asc" }, select: lineSelect });
  const lines: CartLine[] = items.map((it) => {
    const v = it.variant;
    const stock = v.inventory?.quantityInStock ?? 0;
    const available = v.status === "active" && v.product.status === "active" && v.product.approvalStatus === "approved";
    const unitCents = toCents(v.sellingPrice);
    return {
      itemId: it.id,
      variantId: v.id,
      productName: v.product.name,
      productSlug: v.product.slug,
      variantName: v.name,
      sku: v.sku,
      imageUrl: v.product.images[0]?.imageUrl ?? null,
      unitCents,
      quantity: it.quantity,
      stock: available ? stock : 0,
      available,
      lineCents: unitCents * it.quantity,
    };
  });

  // Totals only count lines that can actually be bought.
  const buyable = lines.filter((l) => l.available && l.stock > 0 && l.quantity <= l.stock);
  const problems = lines.length - buyable.length;
  return { cartId: cart.id, lines, totals: computeTotals(lines.map((l) => ({ unitCents: l.unitCents, quantity: l.quantity }))), problems };
}

/** Number of units in the open cart, for the header badge. */
export async function getCartCount(userId: number): Promise<number> {
  const cart = await findActiveCart(userId);
  if (!cart) return 0;
  const agg = await db.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } });
  return agg._sum.quantity ?? 0;
}

export { MAX_LINE_QUANTITY };
