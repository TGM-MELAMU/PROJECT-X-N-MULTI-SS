import { SORT_OPTIONS, type ShopParams, type SortKey } from "./catalogue-types";

type RawParams = Record<string, string | string[] | undefined>;

export const DEFAULT_PARAMS: ShopParams = {
  q: "",
  category: null,
  brands: [],
  minCents: null,
  maxCents: null,
  inStock: false,
  sort: "recommended",
  page: 1,
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

/** Parse a rand amount like "1500" or "1 500,50" into cents; invalid or negative => null. */
function randsToCents(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Read the URL query string into validated shop parameters. Never throws on bad input. */
export function parseShopParams(raw: RawParams): ShopParams {
  const sortRaw = first(raw.sort);
  const sort: SortKey = SORT_OPTIONS.some((o) => o.value === sortRaw) ? (sortRaw as SortKey) : "recommended";

  let minCents = randsToCents(first(raw.min));
  let maxCents = randsToCents(first(raw.max));
  if (minCents != null && maxCents != null && minCents > maxCents) [minCents, maxCents] = [maxCents, minCents];

  const pageNum = Math.floor(Number(first(raw.page)));
  const brands = [...new Set(many(raw.brand).map((b) => b.trim()).filter(Boolean))].slice(0, 20);

  return {
    q: (first(raw.q) ?? "").trim().slice(0, 100),
    category: first(raw.category)?.trim() || null,
    brands,
    minCents,
    maxCents,
    inStock: first(raw.stock) === "1",
    sort,
    page: Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1,
  };
}

/** Build a /shop URL from params, leaving out anything that equals the default. */
export function shopHref(params: ShopParams, overrides: Partial<ShopParams> = {}): string {
  const p = { ...params, ...overrides };
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.category) qs.set("category", p.category);
  for (const b of p.brands) qs.append("brand", b);
  if (p.minCents != null) qs.set("min", String(p.minCents / 100));
  if (p.maxCents != null) qs.set("max", String(p.maxCents / 100));
  if (p.inStock) qs.set("stock", "1");
  if (p.sort !== "recommended") qs.set("sort", p.sort);
  if (p.page > 1) qs.set("page", String(p.page));
  const s = qs.toString();
  return s ? `/shop?${s}` : "/shop";
}

/** True when any filter (not sort or page) is applied. */
export function hasActiveFilters(p: ShopParams): boolean {
  return !!(p.q || p.category || p.brands.length || p.minCents != null || p.maxCents != null || p.inStock);
}
