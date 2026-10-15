import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { LOW_STOCK_THRESHOLD } from "@/lib/catalogue-types";

export const ADMIN_PAGE_SIZE = 25;

function paging(total: number, page: number, size = ADMIN_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pageCount);
  return { page: current, pageCount, skip: (current - 1) * size, take: size };
}

const PAID_STATUSES: OrderStatus[] = ["new", "confirmed", "processing", "completed"];
/** A product with no variant holding any stock. */
const noStock: Prisma.ProductWhereInput = { variants: { none: { inventory: { is: { quantityInStock: { gt: 0 } } } } } };

// ───────────── Dashboard ─────────────

export async function dashboardStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const live: Prisma.ProductWhereInput = { status: "active", approvalStatus: "approved" };
  const [byStatus, liveProducts, pendingApproval, uncategorised, outOfStock, sales, recent] = await Promise.all([
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.product.count({ where: live }),
    db.product.count({ where: { approvalStatus: "pending" } }),
    db.product.count({ where: { ...live, categories: { none: {} } } }),
    db.product.count({ where: { ...live, ...noStock } }),
    db.order.aggregate({ where: { status: { in: PAID_STATUSES }, createdAt: { gte: since } }, _sum: { totalAmount: true }, _count: { _all: true } }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { orderNumber: true, status: true, totalAmount: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
    }),
  ]);
  const orders = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Partial<Record<OrderStatus, number>>;
  return { orders, liveProducts, pendingApproval, uncategorised, outOfStock, sales30: sales._sum.totalAmount, salesCount30: sales._count._all, recent };
}

// ───────────── Orders ─────────────

export async function listOrdersAdmin(f: { q: string; status: OrderStatus | null; page: number }) {
  const where: Prisma.OrderWhereInput = {
    ...(f.status ? { status: f.status } : {}),
    ...(f.q
      ? {
          OR: [
            { orderNumber: { contains: f.q } },
            { user: { email: { contains: f.q } } },
            { user: { lastName: { contains: f.q } } },
            { user: { firstName: { contains: f.q } } },
          ],
        }
      : {}),
  };
  const total = await db.order.count({ where });
  const pg = paging(total, f.page);
  const orders = await db.order.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: pg.skip,
    take: pg.take,
    select: {
      orderNumber: true, status: true, totalAmount: true, createdAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { items: true } },
    },
  });
  return { orders, total, ...pg };
}

export async function getOrderAdmin(orderNumber: string) {
  return db.order.findUnique({
    where: { orderNumber },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      items: { orderBy: { id: "asc" } },
      address: true,
      payments: { orderBy: { id: "desc" } },
      vendorOrders: { include: { vendor: { select: { companyName: true } } }, orderBy: { id: "asc" } },
    },
  });
}

// ───────────── Products ─────────────

export type ProductFilters = {
  q: string;
  status: "draft" | "active" | "inactive" | null;
  approval: "pending" | "approved" | "rejected" | null;
  /** A category id, "none" for uncategorised, or null for any. */
  category: number | "none" | null;
  stock: "out" | "low" | "in" | null;
  featured: boolean;
  page: number;
};

export function productWhere(f: ProductFilters): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];
  if (f.q) {
    and.push({
      OR: [
        { name: { contains: f.q } },
        { brand: { contains: f.q } },
        { variants: { some: { OR: [{ sku: { contains: f.q } }, { modelNumber: { contains: f.q } }] } } },
      ],
    });
  }
  if (f.status) and.push({ status: f.status });
  if (f.approval) and.push({ approvalStatus: f.approval });
  if (f.category === "none") and.push({ categories: { none: {} } });
  else if (typeof f.category === "number") and.push({ categories: { some: { categoryId: f.category } } });
  if (f.featured) and.push({ isFeatured: true });
  if (f.stock === "out") and.push(noStock);
  if (f.stock === "low") and.push({ variants: { some: { inventory: { is: { quantityInStock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } } } } });
  if (f.stock === "in") and.push({ variants: { some: { inventory: { is: { quantityInStock: { gt: LOW_STOCK_THRESHOLD } } } } } });
  return and.length ? { AND: and } : {};
}

export async function listProductsAdmin(f: ProductFilters) {
  const where = productWhere(f);
  const total = await db.product.count({ where });
  const pg = paging(total, f.page);
  const products = await db.product.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: pg.skip,
    take: pg.take,
    select: {
      id: true, name: true, status: true, approvalStatus: true, isFeatured: true,
      variants: { orderBy: { id: "asc" }, select: { sku: true, sellingPrice: true, inventory: { select: { quantityInStock: true } } } },
      categories: { select: { category: { select: { name: true } } } },
    },
  });
  return { products, total, ...pg };
}

export async function getProductAdmin(id: number) {
  return db.product.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, companyName: true } },
      categories: { select: { categoryId: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }] },
      variants: { orderBy: { id: "asc" }, include: { inventory: true } },
    },
  });
}

export async function listVendorsForSelect() {
  return db.vendor.findMany({
    where: { status: "active" },
    orderBy: [{ type: "asc" }, { companyName: "asc" }],
    select: { id: true, companyName: true, type: true },
  });
}

// ───────────── Stock ─────────────

export type StockFilters = { q: string; stock: "out" | "low" | "in" | null; page: number };

export async function listStockAdmin(f: StockFilters) {
  const and: Prisma.ProductVariantWhereInput[] = [];
  if (f.q) and.push({ OR: [{ sku: { contains: f.q } }, { modelNumber: { contains: f.q } }, { product: { name: { contains: f.q } } }] });
  if (f.stock === "out") and.push({ OR: [{ inventory: { is: null } }, { inventory: { is: { quantityInStock: 0 } } }] });
  if (f.stock === "low") and.push({ inventory: { is: { quantityInStock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } } });
  if (f.stock === "in") and.push({ inventory: { is: { quantityInStock: { gt: LOW_STOCK_THRESHOLD } } } });
  const where: Prisma.ProductVariantWhereInput = and.length ? { AND: and } : {};

  const total = await db.productVariant.count({ where });
  const pg = paging(total, f.page);
  const variants = await db.productVariant.findMany({
    where,
    orderBy: [{ product: { name: "asc" } }, { id: "asc" }],
    skip: pg.skip,
    take: pg.take,
    select: {
      id: true, name: true, sku: true, status: true,
      product: { select: { id: true, name: true, status: true } },
      inventory: { select: { quantityInStock: true } },
    },
  });
  return { variants, total, ...pg };
}

// ───────────── Categories ─────────────

export async function listCategoriesAdmin() {
  return db.category.findMany({
    orderBy: [{ name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}
