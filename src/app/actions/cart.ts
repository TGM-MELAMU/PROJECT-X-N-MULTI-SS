"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrCreateCart, findActiveCart } from "@/lib/cart";
import { MAX_LINE_QUANTITY } from "@/lib/totals";
import { safeNext } from "@/lib/auth/redirect";
import { hit } from "@/lib/auth/rate-limit";

export type CartState = { ok?: boolean; message?: string; error?: string; count?: number };

const addSchema = z.object({
  variantId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY).default(1),
  back: z.string().optional(),
});

function refresh() {
  // Re-renders the layout, so the cart badge in the header updates too.
  revalidatePath("/", "layout");
}

export async function addToCartAction(_prev: CartState, formData: FormData): Promise<CartState> {
  const parsed = addSchema.safeParse({
    variantId: formData.get("variantId"),
    quantity: formData.get("quantity") || 1,
    back: formData.get("back") ?? undefined,
  });
  if (!parsed.success) return { error: "Please choose a quantity between 1 and 99." };
  const { variantId, quantity, back } = parsed.data;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(back, "/shop"))}`);
  if (!hit(`cart:${user.id}`, 120, 10 * 60_000).ok) return { error: "You're adding items very quickly. Please wait a moment." };

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: {
      status: true,
      inventory: { select: { quantityInStock: true } },
      product: { select: { name: true, status: true, approvalStatus: true } },
    },
  });
  const live = variant && variant.status === "active" && variant.product.status === "active" && variant.product.approvalStatus === "approved";
  if (!variant || !live) return { error: "Sorry, this product is no longer available." };
  const stock = variant.inventory?.quantityInStock ?? 0;
  if (stock <= 0) return { error: "Sorry, this item is out of stock." };

  const cart = await getOrCreateCart(user.id);
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const wanted = (existing?.quantity ?? 0) + quantity;
  const next = Math.min(wanted, stock, MAX_LINE_QUANTITY);

  if (existing) await db.cartItem.update({ where: { id: existing.id }, data: { quantity: next } });
  else await db.cartItem.create({ data: { cartId: cart.id, variantId, quantity: next } });

  refresh();
  const capped = next < wanted;
  return {
    ok: true,
    message: capped ? `Added. Only ${stock} in stock, so your cart has ${next}.` : "Added to your cart.",
  };
}

async function ownItem(userId: number, itemId: number) {
  const cart = await findActiveCart(userId);
  if (!cart) return null;
  return db.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    select: { id: true, variant: { select: { inventory: { select: { quantityInStock: true } } } } },
  });
}

export async function updateCartItemAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fcart");
  const itemId = Number(formData.get("itemId"));
  const qty = Math.floor(Number(formData.get("quantity")));
  if (!Number.isInteger(itemId) || itemId <= 0 || !Number.isFinite(qty)) return;

  const item = await ownItem(user.id, itemId);
  if (!item) return;
  if (qty <= 0) await db.cartItem.delete({ where: { id: item.id } });
  else {
    const stock = item.variant.inventory?.quantityInStock ?? 0;
    // Allow the saved number to stay above stock only when lowering it; otherwise cap at stock.
    const capped = Math.min(qty, MAX_LINE_QUANTITY, Math.max(stock, 1));
    await db.cartItem.update({ where: { id: item.id }, data: { quantity: capped } });
  }
  refresh();
}

export async function removeCartItemAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fcart");
  const itemId = Number(formData.get("itemId"));
  if (!Number.isInteger(itemId) || itemId <= 0) return;
  const item = await ownItem(user.id, itemId);
  if (item) await db.cartItem.delete({ where: { id: item.id } });
  refresh();
}
