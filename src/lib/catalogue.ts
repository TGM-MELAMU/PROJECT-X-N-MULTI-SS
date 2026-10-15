import { categories as configuredCategories } from "@/config/site";
import { sampleDetail, sampleRows } from "@/lib/catalogue-samples";
import { db } from "@/lib/db";
import { applyNewBadgeGuard, pickShowcase, queryCatalogue } from "@/lib/catalogue-query";
import { buildStoreCategories, categoryLineage, type DbCategory } from "@/lib/store-categories";
import { toCents } from "@/lib/vat";
import {
  OTHER_SLUG,
  SPECIAL_OFFERS_SLUG,
  type CatalogueRow,
  type ProductDetail,
  type ProductSummary,
  type ShopParams,
  type ShopResult,
  type StoreCategory,
} from "@/lib/catalogue-types";

export type { ProductSummary, StoreCategory } from "@/lib/catalogue-types";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_WINDOW_MS = 30 * DAY_MS;
/** Orders in these states count towards "Best selling". */
const COUNTED_ORDER_STATUSES = ["new", "confirmed", "processing", "completed"] as const;

const useMock = () => process.env.USE_MOCK_DATA === "true";

/** The sample categories used by the no-database preview. */
const mockCategories = (): StoreCategory[] =>
  configuredCategories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon, parentSlug: null }));

// ───────────────────────── Categories ─────────────────────────

/** Active categories straight from the `categories` table. */
async function loadCategoryRows(): Promise<DbCategory[]> {
  const rows = await db.category.findMany({
    where: { status: "active" },
    select: { id: true, parentCategoryId: true, name: true, slug: true },
  });
  return rows.map((r) => ({ id: r.id, parentId: r.parentCategoryId, name: r.name, slug: r.slug }));
}

// ───────────────────────── Loading the catalogue ─────────────────────────

/**
 * Loads every active product as a light row. Filtering, sorting and facets then run in memory
 * (see catalogue-query.ts). Measured on the real catalogue (about 6,300 products): load takes
 * roughly half a second, and queries over the loaded rows take a few milliseconds. Comfortable
 * to tens of thousands of products; beyond that, move filtering into SQL.
 */
export async function loadFromDb(): Promise<CatalogueRow[]> {
  const [categoryRows, products, sold] = await Promise.all([
    loadCategoryRows(),
    db.product.findMany({
      // Only approved, active products are public (vendor products wait for admin approval).
      where: { status: "active", approvalStatus: "approved" },
      select: {
        id: true,
        slug: true,
        name: true,
        brand: true,
        description: true,
        isFeatured: true,
        createdAt: true,
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { imageUrl: true } },
        categories: { select: { category: { select: { slug: true } } } },
        variants: {
          where: { status: "active" },
          orderBy: { sellingPrice: "asc" },
          select: {
            id: true,
            name: true,
            sku: true,
            modelNumber: true,
            sellingPrice: true,
            compareAtPrice: true,
            inventory: { select: { quantityInStock: true } },
          },
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
  const storeCategories = buildStoreCategories(categoryRows, configuredCategories);
  const iconBySlug = new Map(storeCategories.map((c) => [c.slug, c.icon]));
  // slug -> itself + its ancestors. Only ACTIVE categories are in here, so a product tagged only
  // with a switched-off category counts as uncategorised.
  const lineage = categoryLineage(categoryRows);
  const now = Date.now();
  const rows: CatalogueRow[] = [];

  for (const p of products) {
    if (p.variants.length === 0) continue; // nothing to sell
    // Show the cheapest variant that is in stock; if none is, the cheapest overall.
    const v = p.variants.find((x) => (x.inventory?.quantityInStock ?? 0) > 0) ?? p.variants[0];
    const direct = p.categories.map((c) => c.category.slug).filter((slug) => lineage.has(slug));
    // A product in a sub-category also appears under its parent categories.
    const slugs = [...new Set(direct.flatMap((slug) => lineage.get(slug) ?? [slug]))];
    const primary = direct.find((s) => s !== SPECIAL_OFFERS_SLUG) ?? direct[0] ?? null;
    const createdAtMs = p.createdAt?.getTime() ?? 0;

    rows.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      imageUrl: p.images[0]?.imageUrl ?? null,
      categorySlug: primary,
      categoryIcon: primary ? iconBySlug.get(primary) : undefined,
      variantId: v.id,
      priceCents: toCents(v.sellingPrice),
      wasCents: v.compareAtPrice ? toCents(v.compareAtPrice) : null,
      multipleVariants: p.variants.length > 1,
      inStock: p.variants.some((x) => (x.inventory?.quantityInStock ?? 0) > 0),
      isNew: now - createdAtMs < NEW_WINDOW_MS,
      categorySlugs: slugs,
      searchText: [p.name, p.brand, p.description?.slice(0, 200), ...p.variants.flatMap((x) => [x.sku, x.modelNumber, x.name])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      createdAtMs,
      popularity: p.variants.reduce((sum, x) => sum + (soldByVariant.get(x.id) ?? 0), 0),
      isFeatured: p.isFeatured,
    });
  }
  return applyNewBadgeGuard(rows);
}

// ── In-process cache ──
// The catalogue is about 3 MB, over the 2 MB limit of Next's data cache, so it lives in this
// process's memory instead. Concurrent requests share one load, and if a reload fails the previous
// rows keep being served. With several server processes each one keeps its own copy (so a change
// can take up to CACHE_TTL_MS to appear everywhere).
const CACHE_TTL_MS = 60_000;
type CacheState = { rows?: CatalogueRow[]; loadedAt: number; inflight?: Promise<CatalogueRow[]> };
const g = globalThis as unknown as { __catalogueCache?: CacheState };
const cache: CacheState = (g.__catalogueCache ??= { loadedAt: 0 });

/** Call after catalogue edits (admin dashboard, Phase 6) so changes show immediately. */
export function invalidateCatalogue(): void {
  cache.loadedAt = 0;
  categoryCache.loadedAt = 0;
}

// The category list is tiny and is needed on EVERY page (the header menu), so it has its own cache
// instead of making every page wait for the 6,000-product catalogue.
type CategoryCacheState = { list?: StoreCategory[]; loadedAt: number; inflight?: Promise<StoreCategory[]> };
const gc = globalThis as unknown as { __categoryCache?: CategoryCacheState };
const categoryCache: CategoryCacheState = (gc.__categoryCache ??= { loadedAt: 0 });

async function loadCategoriesCached(): Promise<StoreCategory[]> {
  if (categoryCache.list && Date.now() - categoryCache.loadedAt < CACHE_TTL_MS) return categoryCache.list;
  categoryCache.inflight ??= loadCategoryRows()
    .then((rows) => {
      categoryCache.list = buildStoreCategories(rows, configuredCategories);
      categoryCache.loadedAt = Date.now();
      return categoryCache.list;
    })
    .catch((err) => {
      if (categoryCache.list) {
        console.error("category reload failed, serving the previous list", err);
        return categoryCache.list;
      }
      throw err;
    })
    .finally(() => {
      categoryCache.inflight = undefined;
    });
  return categoryCache.inflight;
}

/** Categories for menus and filters: top-level and sub-categories, "Special Offers" last. */
export async function getStoreCategories(): Promise<StoreCategory[]> {
  return useMock() ? mockCategories() : loadCategoriesCached();
}

async function loadCached(): Promise<CatalogueRow[]> {
  const fresh = cache.rows && Date.now() - cache.loadedAt < CACHE_TTL_MS;
  if (fresh) return cache.rows!;
  cache.inflight ??= loadFromDb()
    .then((rows) => {
      cache.rows = rows;
      cache.loadedAt = Date.now();
      return rows;
    })
    .catch((err) => {
      if (cache.rows) {
        console.error("catalogue reload failed, serving the previous copy", err);
        return cache.rows;
      }
      throw err;
    })
    .finally(() => {
      cache.inflight = undefined;
    });
  return cache.inflight;
}

/** All active products. Set USE_MOCK_DATA=true to use the built-in samples (no database needed). */
export async function getCatalogue(): Promise<CatalogueRow[]> {
  return useMock() ? sampleRows() : loadCached();
}

// ───────────────────────── Queries used by pages ─────────────────────────

export async function getFeaturedProducts(limit = 8): Promise<ProductSummary[]> {
  const rows = await getCatalogue();
  const featured = rows
    .filter((r) => r.isFeatured)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, limit);
  // Nothing hand-picked yet (the imported catalogue has no featured flags): show a sensible spread
  // rather than an empty home page. Marking products as featured in the admin replaces this.
  return featured.length > 0 ? featured : pickShowcase(rows, limit);
}

export async function getShopResult(params: ShopParams): Promise<ShopResult> {
  const [rows, categories] = await Promise.all([getCatalogue(), getStoreCategories()]);
  // "Other products" is a virtual category for anything not yet categorised.
  return queryCatalogue(rows, params, [...categories.map((c) => c.slug), OTHER_SLUG]);
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
    where: { slug, status: "active", approvalStatus: "approved" },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      specifications: { orderBy: { sortOrder: "asc" } },
      categories: { include: { category: { select: { name: true, slug: true, status: true } } } },
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
      .filter((c) => c.status === "active" && c.slug !== SPECIAL_OFFERS_SLUG)
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
