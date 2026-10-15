import {
  OTHER_SLUG,
  SPECIAL_OFFERS_SLUG,
  type CatalogueRow,
  type Facets,
  type ShopParams,
  type ShopResult,
} from "./catalogue-types";

export const PAGE_SIZE = 12;

const isOnSale = (r: CatalogueRow) => r.wasCents != null && r.wasCents > r.priceCents;

function inCategory(r: CatalogueRow, slug: string): boolean {
  // "Other products": nothing but, at most, the derived Special Offers tag.
  if (slug === OTHER_SLUG) return r.categorySlugs.every((s) => s === SPECIAL_OFFERS_SLUG);
  // "Special Offers" is derived from compare-at prices so staff never have to tag it by hand.
  if (slug === SPECIAL_OFFERS_SLUG) return isOnSale(r) || r.categorySlugs.includes(slug);
  return r.categorySlugs.includes(slug);
}

/** Every search word must appear somewhere in the product's text. */
function matchesQuery(r: CatalogueRow, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((w) => r.searchText.includes(w));
}

type Omit = "category" | "brand";

function filterRows(rows: CatalogueRow[], p: ShopParams, omit?: Omit): CatalogueRow[] {
  const brandSet = new Set(p.brands.map((b) => b.toLowerCase()));
  return rows.filter((r) => {
    if (p.q && !matchesQuery(r, p.q)) return false;
    if (omit !== "category" && p.category && !inCategory(r, p.category)) return false;
    if (omit !== "brand" && brandSet.size && !(r.brand && brandSet.has(r.brand.toLowerCase()))) return false;
    if (p.minCents != null && r.priceCents < p.minCents) return false;
    if (p.maxCents != null && r.priceCents > p.maxCents) return false;
    if (p.inStock && !r.inStock) return false;
    return true;
  });
}

/** How well a product matches the search text: name matches beat description matches. */
function relevance(r: CatalogueRow, q: string): number {
  const name = r.name.toLowerCase();
  const query = q.toLowerCase();
  if (name === query) return 4;
  if (name.startsWith(query)) return 3;
  if (name.includes(query)) return 2;
  if (r.brand?.toLowerCase().includes(query)) return 1;
  return 0;
}

function sortRows(rows: CatalogueRow[], p: ShopParams): CatalogueRow[] {
  const out = [...rows];
  const byName = (a: CatalogueRow, b: CatalogueRow) => a.name.localeCompare(b.name, "en");
  switch (p.sort) {
    case "newest":
      return out.sort((a, b) => b.createdAtMs - a.createdAtMs || byName(a, b));
    case "popular":
      return out.sort((a, b) => b.popularity - a.popularity || b.createdAtMs - a.createdAtMs);
    case "price-asc":
      return out.sort((a, b) => a.priceCents - b.priceCents || byName(a, b));
    case "price-desc":
      return out.sort((a, b) => b.priceCents - a.priceCents || byName(a, b));
    case "name":
      return out.sort(byName);
    case "recommended":
    default:
      return out.sort((a, b) => {
        if (p.q) {
          const d = relevance(b, p.q) - relevance(a, p.q);
          if (d) return d;
        }
        // In-stock first, then featured, then newest: out-of-stock items sink without disappearing.
        return (
          Number(b.inStock) - Number(a.inStock) ||
          Number(b.isFeatured) - Number(a.isFeatured) ||
          b.createdAtMs - a.createdAtMs ||
          byName(a, b)
        );
      });
  }
}

function buildFacets(rows: CatalogueRow[], p: ShopParams, allCategorySlugs: string[]): Facets {
  // Standard faceting: each facet is counted over the results of every OTHER filter, so users
  // can see what switching that filter would give them.
  const forCategory = filterRows(rows, p, "category");
  const forBrand = filterRows(rows, p, "brand");

  const categories = allCategorySlugs.map((slug) => ({
    slug,
    count: forCategory.filter((r) => inCategory(r, slug)).length,
  }));

  const brandCounts = new Map<string, number>();
  for (const r of forBrand) if (r.brand) brandCounts.set(r.brand, (brandCounts.get(r.brand) ?? 0) + 1);
  // Selected brands stay listed even if they currently match nothing, so they can be unticked.
  for (const b of p.brands) if (!brandCounts.has(b)) brandCounts.set(b, 0);
  const brands = [...brandCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  return { categories, brands };
}

/**
 * Filter, sort, paginate and facet an in-memory catalogue. Pure: no database access, so the exact
 * same logic serves MySQL data and the no-database preview, and can be unit-tested directly.
 */
export function queryCatalogue(
  rows: CatalogueRow[],
  params: ShopParams,
  allCategorySlugs: string[],
  pageSize = PAGE_SIZE,
): ShopResult {
  const filtered = sortRows(filterRows(rows, params), params);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, params.page), pageCount);
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { items, total, page, pageCount, pageSize, facets: buildFacets(rows, params, allCategorySlugs) };
}

/**
 * Hides every "New" badge when a bulk import has made a large share of the catalogue "new" at once
 * (the first 6,300 products were all created on one day, so every card said "New"). Once real
 * new products arrive a month after the import, the badge comes back by itself.
 */
export function applyNewBadgeGuard<T extends { isNew: boolean }>(rows: T[], maxShare = 0.05): T[] {
  if (rows.length === 0) return rows;
  const newCount = rows.reduce((n, r) => n + (r.isNew ? 1 : 0), 0);
  if (newCount / rows.length <= maxShare) return rows;
  return rows.map((r) => (r.isNew ? { ...r, isNew: false } : r));
}

/**
 * Products for the home page when nobody has marked any as featured yet: in stock first, then
 * best selling, then newest, with at most `perCategory` from one category so it isn't a wall of
 * one kind of product.
 */
export function pickShowcase(rows: CatalogueRow[], limit: number, perCategory = 2): CatalogueRow[] {
  const sorted = [...rows].sort(
    (a, b) =>
      Number(b.inStock) - Number(a.inStock) ||
      b.popularity - a.popularity ||
      b.createdAtMs - a.createdAtMs ||
      a.name.localeCompare(b.name, "en"),
  );
  const picked: CatalogueRow[] = [];
  const perCat = new Map<string, number>();
  for (const r of sorted) {
    if (picked.length >= limit) break;
    const key = r.categorySlug ?? "";
    if ((perCat.get(key) ?? 0) >= perCategory) continue;
    perCat.set(key, (perCat.get(key) ?? 0) + 1);
    picked.push(r);
  }
  // Fewer categories than needed: fill the rest without the cap.
  for (const r of sorted) {
    if (picked.length >= limit) break;
    if (!picked.includes(r)) picked.push(r);
  }
  return picked;
}
