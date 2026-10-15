"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { adminName, requireAdmin } from "@/lib/admin/guard";
import { safeAdminBack, withFlash } from "@/lib/admin/links";
import { appendNote, canTransition, noteLine, restocksOnCancel, vendorStatusFor } from "@/lib/admin/order-flow";
import {
  categorySchema, firstError, imageSchema, MAX_STOCK_CSV_BYTES, newProductSchema, orderStatusSchema, parseRands, parseStockCsv,
  productSchema, RESERVED_CATEGORY_SLUGS, slugify, stockSchema, variantSchema, type StockCsvProblem,
} from "@/lib/admin/validation";
import { ORDER_STATUS } from "@/lib/account/order-status";
import { invalidateCatalogue } from "@/lib/catalogue";
import { stockAfterRestock } from "@/lib/stock";
import { centsToDecimalString } from "@/lib/vat";

// ───────────── helpers ─────────────

const text = (fd: FormData, k: string): string => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
const backTo = (fd: FormData, fallback: string) => safeAdminBack(text(fd, "back"), fallback);

// Declared as functions with an explicit `never` so the code after `if (!ok) fail(...)` is known to be safe.
function done(path: string, message: string): never {
  redirect(withFlash(path, "notice", message));
}
function fail(path: string, message: string): never {
  redirect(withFlash(path, "error", message));
}

/** After a catalogue change: drop the in-memory catalogue and re-render pages that show it. */
function refreshStorefront() {
  invalidateCatalogue();
  revalidatePath("/", "layout");
}

const isUnique = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

class Changed extends Error {}

/** Sets a variant's stock to an exact number and writes the movement that explains it. Returns whether anything changed. */
async function setVariantStock(tx: Prisma.TransactionClient, variantId: number, quantity: number, adminId: number, note: string): Promise<boolean> {
  const inv = await tx.inventory.findUnique({ where: { variantId } });
  const prev = inv?.quantityInStock ?? 0;
  const changed = prev !== quantity;
  if (!inv) await tx.inventory.create({ data: { variantId, quantityInStock: quantity } });
  else if (changed) await tx.inventory.update({ where: { variantId }, data: { quantityInStock: quantity } });
  if (changed) {
    await tx.inventoryMovement.create({
      data: {
        variantId, type: quantity > prev ? "stock_in" : "adjustment", quantityChange: quantity - prev,
        previousQuantity: prev, newQuantity: quantity, performedById: adminId, notes: note.slice(0, 255),
      },
    });
  }
  return changed;
}

// ───────────── Orders ─────────────

export async function updateOrderStatusAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const orderNumber = text(fd, "orderNumber");
  const here = `/admin/orders/${encodeURIComponent(orderNumber)}`;
  const parsed = orderStatusSchema.safeParse({ orderNumber, to: text(fd, "to"), note: text(fd, "note") });
  if (!parsed.success) fail(here, firstError(parsed.error));
  const { to, note } = parsed.data;

  const order = await db.order.findUnique({
    where: { orderNumber },
    select: { id: true, status: true, items: { select: { variantId: true, quantity: true } } },
  });
  if (!order) fail(here, "That order doesn't exist.");
  if (!canTransition(order.status, to)) {
    fail(here, `An order that is "${ORDER_STATUS[order.status].label}" can't be moved to "${ORDER_STATUS[to].label}".`);
  }

  const restock = to === "cancelled" && restocksOnCancel(order.status);
  const from = order.status;
  try {
    await db.$transaction(async (tx) => {
      // Read the notes inside the transaction so a note added a moment ago isn't overwritten.
      const fresh = await tx.order.findUnique({ where: { id: order.id }, select: { adminNotes: true } });
      const line = noteLine(new Date(), adminName(admin), `${ORDER_STATUS[from].label} → ${ORDER_STATUS[to].label}${note ? `: ${note}` : ""}`);
      // Only moves the order if it is still in the status the admin was looking at.
      const claim = await tx.order.updateMany({
        where: { id: order.id, status: from },
        data: { status: to, adminNotes: appendNote(fresh?.adminNotes, line) },
      });
      if (claim.count !== 1) throw new Changed();

      const vendorStatus = vendorStatusFor(to);
      if (vendorStatus) await tx.vendorOrder.updateMany({ where: { orderId: order.id, status: { not: "refunded" } }, data: { status: vendorStatus } });

      if (restock) {
        for (const it of order.items) {
          const inv = await tx.inventory.findUnique({ where: { variantId: it.variantId } });
          const prev = inv?.quantityInStock ?? 0;
          const { next } = stockAfterRestock(prev, it.quantity);
          if (inv) await tx.inventory.update({ where: { variantId: it.variantId }, data: { quantityInStock: next } });
          else await tx.inventory.create({ data: { variantId: it.variantId, quantityInStock: next } });
          await tx.inventoryMovement.create({
            data: {
              variantId: it.variantId, type: "return", quantityChange: it.quantity, previousQuantity: prev, newQuantity: next,
              performedById: admin.id, notes: `Order ${orderNumber} cancelled`,
            },
          });
        }
      }
    });
  } catch (err) {
    if (err instanceof Changed) fail(here, "Someone else changed this order a moment ago. Check its status below and try again.");
    throw err;
  }

  if (restock) refreshStorefront();
  revalidatePath("/admin", "layout");
  done(
    here,
    restock
      ? "Order cancelled and its items are back in stock. If the customer already paid, refund them in PayFast: this site doesn't move money."
      : `Order moved to "${ORDER_STATUS[to].label}".`,
  );
}

export async function addOrderNoteAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const orderNumber = text(fd, "orderNumber");
  const here = `/admin/orders/${encodeURIComponent(orderNumber)}`;
  const note = text(fd, "note").trim();
  if (!note) fail(here, "Write a note first.");
  if (note.length > 500) fail(here, "The note is too long (most 500 characters).");

  await db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { orderNumber }, select: { id: true, adminNotes: true } });
    if (!o) return;
    await tx.order.update({ where: { id: o.id }, data: { adminNotes: appendNote(o.adminNotes, noteLine(new Date(), adminName(admin), note)) } });
  });
  done(here, "Note added.");
}

// ───────────── Products ─────────────

export async function createProductAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const here = "/admin/products/new";
  const parsed = newProductSchema.safeParse({
    name: text(fd, "name"), sku: text(fd, "sku"), vendorId: text(fd, "vendorId"), price: text(fd, "price"), status: text(fd, "status"),
  });
  if (!parsed.success) fail(here, firstError(parsed.error));
  const v = parsed.data;
  const cents = parseRands(v.price);
  if (cents == null || cents <= 0) fail(here, "Enter the price in rand, like 1250 or 1250.50. It must be more than zero.");

  const vendor = await db.vendor.findUnique({ where: { id: v.vendorId }, select: { id: true } });
  if (!vendor) fail(here, "Choose a seller from the list.");

  const base = slugify(v.name) || "product";
  let slug = base;
  for (let i = 2; i < 50 && (await db.product.findUnique({ where: { slug }, select: { id: true } })); i++) slug = `${base}-${i}`;

  let productId: number;
  try {
    productId = await db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          vendorId: vendor.id, name: v.name, slug, status: v.status,
          // Created by an administrator, so there is nobody to approve it.
          approvalStatus: "approved", reviewedById: admin.id, reviewedAt: new Date(),
        },
      });
      const variant = await tx.productVariant.create({
        data: { productId: p.id, name: "Standard", sku: v.sku, unit: "Each", sellingPrice: centsToDecimalString(cents) },
      });
      await tx.inventory.create({ data: { variantId: variant.id, quantityInStock: 0 } });
      return p.id;
    });
  } catch (err) {
    if (isUnique(err)) fail(here, `The SKU "${v.sku}" is already used by another product.`);
    throw err;
  }
  refreshStorefront();
  done(`/admin/products/${productId}`, "Product created. Add its category, description and photo below, and set its stock.");
}

export async function updateProductAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const idRaw = text(fd, "id");
  const here = backTo(fd, `/admin/products/${encodeURIComponent(idRaw)}`);
  const parsed = productSchema.safeParse({
    id: idRaw, name: text(fd, "name"), brand: text(fd, "brand"), description: text(fd, "description"), status: text(fd, "status"),
    approvalStatus: text(fd, "approvalStatus"), rejectionReason: text(fd, "rejectionReason"), isFeatured: fd.get("isFeatured"),
    categoryIds: fd.getAll("categoryId").filter((x): x is string => typeof x === "string"),
  });
  if (!parsed.success) fail(here, firstError(parsed.error));
  const p = parsed.data;
  const categoryIds = [...new Set(p.categoryIds)];

  const existing = await db.product.findUnique({ where: { id: p.id }, select: { id: true, approvalStatus: true } });
  if (!existing) fail("/admin/products", "That product doesn't exist.");
  if (categoryIds.length && (await db.category.count({ where: { id: { in: categoryIds } } })) !== categoryIds.length) {
    fail(here, "One of the chosen categories no longer exists. Reload the page and try again.");
  }
  const approvalChanged = existing.approvalStatus !== p.approvalStatus;

  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: p.id },
      data: {
        name: p.name, brand: p.brand ?? null, description: p.description ?? null, status: p.status, isFeatured: p.isFeatured,
        approvalStatus: p.approvalStatus,
        rejectionReason: p.approvalStatus === "rejected" ? (p.rejectionReason ?? null) : null,
        ...(approvalChanged ? { reviewedById: admin.id, reviewedAt: new Date() } : {}),
      },
    });
    await tx.productCategory.deleteMany({ where: { productId: p.id } });
    if (categoryIds.length) await tx.productCategory.createMany({ data: categoryIds.map((categoryId) => ({ productId: p.id, categoryId })) });
  });
  refreshStorefront();
  done(here, "Product saved.");
}

export async function updateVariantAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const productId = text(fd, "productId");
  const here = backTo(fd, `/admin/products/${encodeURIComponent(productId)}`);
  const parsed = variantSchema.safeParse({
    id: text(fd, "id"), productId, name: text(fd, "name"), modelNumber: text(fd, "modelNumber"), unit: text(fd, "unit"),
    price: text(fd, "price"), compareAt: text(fd, "compareAt"), status: text(fd, "status"),
  });
  if (!parsed.success) fail(here, firstError(parsed.error));
  const v = parsed.data;

  const owned = await db.productVariant.findFirst({ where: { id: v.id, productId: v.productId }, select: { id: true } });
  if (!owned) fail(here, "That variant doesn't belong to this product.");

  await db.productVariant.update({
    where: { id: v.id },
    data: {
      name: v.name, modelNumber: v.modelNumber ?? null, unit: v.unit ?? null, status: v.status,
      sellingPrice: centsToDecimalString(v.priceCents),
      compareAtPrice: v.compareAtCents != null ? centsToDecimalString(v.compareAtCents) : null,
    },
  });
  refreshStorefront();
  done(here, "Price and details saved.");
}

export async function addProductImageAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const productId = text(fd, "productId");
  const here = backTo(fd, `/admin/products/${encodeURIComponent(productId)}`);
  const parsed = imageSchema.safeParse({ productId, url: text(fd, "url"), alt: text(fd, "alt") });
  if (!parsed.success) fail(here, firstError(parsed.error));
  const i = parsed.data;

  const count = await db.productImage.count({ where: { productId: i.productId } });
  if (count >= 12) fail(here, "A product can have at most 12 photos.");
  await db.productImage.create({ data: { productId: i.productId, imageUrl: i.url, altText: i.alt ?? null, isPrimary: count === 0, sortOrder: count } });
  refreshStorefront();
  done(here, "Photo added.");
}

export async function removeProductImageAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const productId = Number(text(fd, "productId"));
  const imageId = Number(text(fd, "imageId"));
  const here = backTo(fd, `/admin/products/${productId}`);
  if (!Number.isInteger(productId) || !Number.isInteger(imageId)) fail(here, "Something went wrong. Reload the page and try again.");

  await db.$transaction(async (tx) => {
    const img = await tx.productImage.findFirst({ where: { id: imageId, productId } });
    if (!img) return;
    await tx.productImage.delete({ where: { id: img.id } });
    if (img.isPrimary) {
      const next = await tx.productImage.findFirst({ where: { productId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
      if (next) await tx.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  });
  refreshStorefront();
  done(here, "Photo removed.");
}

export async function makePrimaryImageAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const productId = Number(text(fd, "productId"));
  const imageId = Number(text(fd, "imageId"));
  const here = backTo(fd, `/admin/products/${productId}`);
  if (!Number.isInteger(productId) || !Number.isInteger(imageId)) fail(here, "Something went wrong. Reload the page and try again.");

  await db.$transaction(async (tx) => {
    const img = await tx.productImage.findFirst({ where: { id: imageId, productId }, select: { id: true } });
    if (!img) return;
    await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
    await tx.productImage.update({ where: { id: img.id }, data: { isPrimary: true } });
  });
  refreshStorefront();
  done(here, "Main photo changed.");
}

// ───────────── Stock ─────────────

export async function setStockAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const here = backTo(fd, "/admin/stock");
  const parsed = stockSchema.safeParse({ variantId: text(fd, "variantId"), quantity: text(fd, "quantity"), note: text(fd, "note") });
  if (!parsed.success) fail(here, firstError(parsed.error));
  const s = parsed.data;

  const variant = await db.productVariant.findUnique({ where: { id: s.variantId }, select: { sku: true } });
  if (!variant) fail(here, "That product variant doesn't exist.");

  const changed = await db.$transaction((tx) => setVariantStock(tx, s.variantId, s.quantity, admin.id, s.note ?? "Set by admin"));
  if (changed) refreshStorefront();
  done(here, changed ? `Stock for ${variant.sku} is now ${s.quantity}.` : `${variant.sku} already had ${s.quantity} in stock.`);
}

export type StockImportState = {
  error?: string;
  summary?: { updated: number; unchanged: number; unknownSkus: number; skippedLines: number };
  unknownSample?: string[];
  problems?: StockCsvProblem[];
};

/**
 * Sets stock for many products from a sheet of SKU and quantity. It only ever sets the quantity of
 * SKUs that already exist: it never creates products, and SKUs it can't find are listed back.
 */
export async function importStockAction(_prev: StockImportState, fd: FormData): Promise<StockImportState> {
  const admin = await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file first." };
  if (file.size > MAX_STOCK_CSV_BYTES) return { error: "That file is too big (most 2 MB). Split it into smaller files." };

  const { rows, problems } = parseStockCsv(await file.text());
  if (rows.length === 0) return { error: problems[0]?.message ?? "There was nothing to import in that file.", problems: problems.slice(0, 50) };

  // Match SKUs to variants (the database compares SKUs ignoring letter case).
  const found = new Map<string, { id: number; qty: number | null }>();
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000);
    const variants = await db.productVariant.findMany({
      where: { sku: { in: chunk.map((r) => r.sku) } },
      select: { id: true, sku: true, inventory: { select: { quantityInStock: true } } },
    });
    for (const v of variants) found.set(v.sku.toLowerCase(), { id: v.id, qty: v.inventory ? v.inventory.quantityInStock : null });
  }

  const unknown: string[] = [];
  const todo: Array<{ variantId: number; hasRow: boolean; prev: number; next: number }> = [];
  let unchanged = 0;
  for (const r of rows) {
    const v = found.get(r.sku.toLowerCase());
    if (!v) unknown.push(r.sku);
    else if (v.qty !== null && v.qty === r.quantity) unchanged++;
    else todo.push({ variantId: v.id, hasRow: v.qty !== null, prev: v.qty ?? 0, next: r.quantity });
  }

  const note = `CSV import ${file.name.slice(0, 80)}`;
  for (let i = 0; i < todo.length; i += 200) {
    const chunk = todo.slice(i, i + 200);
    await db.$transaction([
      ...chunk.map((t) =>
        t.hasRow
          ? db.inventory.update({ where: { variantId: t.variantId }, data: { quantityInStock: t.next } })
          : db.inventory.create({ data: { variantId: t.variantId, quantityInStock: t.next } }),
      ),
      db.inventoryMovement.createMany({
        data: chunk
          .filter((t) => t.next !== t.prev)
          .map((t) => ({
            variantId: t.variantId, type: t.next > t.prev ? ("stock_in" as const) : ("adjustment" as const), quantityChange: t.next - t.prev,
            previousQuantity: t.prev, newQuantity: t.next, performedById: admin.id, notes: note,
          })),
      }),
    ]);
  }
  if (todo.length) refreshStorefront();
  revalidatePath("/admin", "layout");

  return {
    summary: { updated: todo.length, unchanged, unknownSkus: unknown.length, skippedLines: problems.length },
    unknownSample: unknown.slice(0, 30),
    problems: problems.slice(0, 50),
  };
}

// ───────────── Categories ─────────────

async function saveCategory(fd: FormData, existingId: number | null): Promise<void> {
  await requireAdmin();
  const here = backTo(fd, "/admin/categories");
  const parsed = categorySchema.safeParse({
    id: existingId == null ? undefined : String(existingId), name: text(fd, "name"), slug: text(fd, "slug"),
    description: text(fd, "description"), parentId: text(fd, "parentId"), status: text(fd, "status"),
  });
  if (!parsed.success) fail(here, firstError(parsed.error));
  const c = parsed.data;

  const all = await db.category.findMany({ select: { id: true, slug: true, parentCategoryId: true } });
  const current = existingId == null ? null : all.find((x) => x.id === existingId) ?? null;
  if (existingId != null && !current) fail(here, "That category doesn't exist.");

  // A reserved category (Special Offers) keeps its web address: the shop depends on it.
  const slug = current && (RESERVED_CATEGORY_SLUGS as readonly string[]).includes(current.slug) ? current.slug : c.slug;

  if (c.parentId != null) {
    if (!all.some((x) => x.id === c.parentId)) fail(here, "The parent category you chose doesn't exist.");
    // The parent must not be the category itself or one of its own sub-categories.
    const byId = new Map(all.map((x) => [x.id, x]));
    for (let p = byId.get(c.parentId), hops = 0; p && hops < 50; p = p.parentCategoryId != null ? byId.get(p.parentCategoryId) : undefined, hops++) {
      if (existingId != null && p.id === existingId) fail(here, "A category can't sit inside itself or inside one of its own sub-categories.");
    }
  }

  try {
    if (existingId == null) {
      await db.category.create({ data: { name: c.name, slug, description: c.description ?? null, parentCategoryId: c.parentId ?? null, status: c.status } });
    } else {
      await db.category.update({
        where: { id: existingId },
        data: { name: c.name, slug, description: c.description ?? null, parentCategoryId: c.parentId ?? null, status: c.status },
      });
    }
  } catch (err) {
    if (isUnique(err)) fail(here, `The web address "${slug}" is already used by another category.`);
    throw err;
  }
  refreshStorefront();
  done(here, existingId == null ? `Category "${c.name}" created.` : `Category "${c.name}" saved.`);
}

export async function createCategoryAction(fd: FormData): Promise<void> {
  return saveCategory(fd, null);
}

export async function updateCategoryAction(fd: FormData): Promise<void> {
  const id = Number(text(fd, "id"));
  if (!Number.isInteger(id) || id <= 0) fail(backTo(fd, "/admin/categories"), "Something went wrong. Reload the page and try again.");
  return saveCategory(fd, id);
}
