import { unstable_cache } from "next/cache";
import { categories } from "@/config/site";
import { iconFor, sampleDetail, sampleRows } from "@/lib/catalogue-samples";
import { db } from "@/lib/db";
import { queryCatalogue } from "@/lib/catalogue-query";
import { toCents } from "@/lib/vat";
import {
  SPECIAL_OFFERS_SLUG,
  type CatalogueRow,
  type ProductDetail,
  type ProductSummary,
  type ShopParams,
  type ShopResult,
} from "@/lib/catalogue-types";

export type { ProductSummary } from "@/lib/catalogue-types";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_WINDOW_MS = 30 * DAY_MS;
/** Orders in these states count towards "Best selling". */
const COUNTED_ORDER_STATUSES = ["new", "confirmed", "processing", "completed"] as const;

const useMock = () => process.env.USE_MOCK_DATA === "true";
const categorySlugs = categories.map((c) => c.slug);

// ───────────────────────── Loading the catalogue ─────────────────────────

/**
 * Loads every active product as a light row. Filtering, sorting and facets then run in memory
 * (see catalogue-query.ts). That is simple and fast for a catalogue of up to a few thousand
 * products; beyond that, move filtering into SQL.
 */
export async function loadFromDb(): Promise<CatalogueRow[]> {
  const [products, sold] = await Promise.all([
    db.product.findMany({
      where: { status: "active" },
      include: {
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
        categories: { include: { category: { select: { slug: true } } } },
        variants: {
          where: { status: "active" },
          orderBy: { sellingPrice: "asc" },
          include: { inventory: true },
        },
      },
    }),
    db.orderItem.groupBy({
      by: ["variantId"],
      where: { order: { status: { in: [...COUNTED_ORDER_STATUSES] } } },
      _sum: { quantity: true },
    }),
  ]);

  const soldByVariant = new Map(sold.map((s) => [s.variantId, s._sum.quantity ?? 0]));
  const now = Date.now();
  const rows: CatalogueRow[] = [];

  for (const p of products) {
    if (p.variants.length === 0) continue; // nothing to sell
    // Show the cheapest variant that is in stock; if none is, the cheapest overall.
    const v = p.variants.find((x) => (x.inventory?.quantityInStock ?? 0) > 0) ?? p.variants[0];
    const slugs = p.categories.map((c) => c.category.slug);
    const primary = slugs.find((s) => s !== SPECIAL_OFFERS_SLUG) ?? slugs[0] ?? null;
    const createdAtMs = p.createdAt?.getTime() ?? 0;

    rows.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      imageUrl: p.images[0]?.imageUrl ?? null,
      categorySlug: primary,
      categoryIcon: iconFor(primary),
      variantId: v.id,
      priceCents: toCents(v.sellingPrice),
      wasCents: v.compareAtPrice ? toCents(v.compareAtPrice) : null,
      multipleVariants: p.variants.length > 1,
      inStock: p.variants.some((x) => (x.inventory?.quantityInStock ?? 0) > 0),
      isNew: now - createdAtMs < NEW_WINDOW_MS,
      description: p.description,
      categorySlugs: slugs,
      searchText: [p.name, p.brand, p.description, ...p.variants.flatMap((x) => [x.sku, x.modelNumber, x.name])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      createdAtMs,
      popularity: p.variants.reduce((sum, x) => sum + (soldByVariant.get(x.id) ?? 0), 0),
      isFeatured: p.isFeatured,
    });
  }
  return rows;
}

// Cached briefly so a burst of visitors doesn't reload the whole catalogue each time.
// Staff changes appear within a minute; call revalidateTag("catalogue") after admin edits (Phase 6).
const loadCached = unstable_cache(loadFromDb, ["catalogue-rows-v1"], { revalidate: 60, tags: ["catalogue"] });

/** All active products. Set USE_MOCK_DATA=true to use the built-in samples (no database needed). */
export async function getCatalogue(): Promise<CatalogueRow[]> {
  return useMock() ? sampleRows() : loadCached();
}

// ───────────────────────── Queries used by pages ─────────────────────────

export async function getFeaturedProducts(limit = 8): Promise<ProductSummary[]> {
  const rows = await getCatalogue();
  return rows
    .filter((r) => r.isFeatured)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, limit);
}

export async function getShopResult(params: ShopParams): Promise<ShopResult> {
  return queryCatalogue(await getCatalogue(), params, categorySlugs);
}

export async function getRelatedProducts(categorySlug: string | null, excludeId: number, limit = 4) {
  if (!categorySlug) return [];
  const rows = await getCatalogue();
  return rows
    .filter((r) => r.id !== excludeId && r.categorySlugs.includes(categorySlug))
    .sort((a, b) => Number(b.inStock) - Number(a.inStock) || b.popularity - a.popularity)
    .slice(0, limit);
}

/**
 * Full product for the detail page. Never cached: stock and price must be current when someone
 * is about to buy. Returns null for unknown, inactive or variant-less products.
 */
export async function getProductDetail(slug: string): Promise<ProductDetail | null> {
  if (useMock()) return sampleDetail(slug);

  const p = await db.product.findFirst({
    where: { slug, status: "active" },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      specifications: { orderBy: { sortOrder: "asc" } },
      categories: { include: { category: { select: { name: true, slug: true } } } },
      variants: {
        where: { status: "active" },
        orderBy: { sellingPrice: "asc" },
        include: { inventory: true },
      },
    },
  });
  if (!p || p.variants.length === 0) return null;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    description: p.description,
    categories: p.categories
      .map((c) => c.category)
      .filter((c) => c.slug !== SPECIAL_OFFERS_SLUG)
      .map((c) => ({ name: c.name, slug: c.slug })),
    images: p.images.map((i) => ({ url: i.imageUrl, alt: i.altText ?? p.name })),
    specs: p.specifications.map((s) => ({ name: s.name, value: s.value })),
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      modelNumber: v.modelNumber,
      unit: v.unit,
      priceCents: toCents(v.sellingPrice),
      wasCents: v.compareAtPrice ? toCents(v.compareAtPrice) : null,
      stock: v.inventory?.quantityInStock ?? 0,
    })),
  };
}
