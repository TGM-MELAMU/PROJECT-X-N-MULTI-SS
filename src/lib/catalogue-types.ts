import type { CategoryIconName } from "@/config/site";

/** What a product card needs. Prices are VAT-inclusive integer cents. */
export type ProductSummary = {
  id: number;
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  categorySlug: string | null;
  categoryIcon?: CategoryIconName;
  variantId: number;
  priceCents: number;
  wasCents: number | null;
  /** True when the product has more than one active variant (card shows "From"). */
  multipleVariants: boolean;
  inStock: boolean;
  isNew: boolean;
};

/** One row of the in-memory catalogue that filtering, sorting and facets run over. */
export type CatalogueRow = ProductSummary & {
  categorySlugs: string[];
  /** Lower-cased text searched by `q`: name, brand, start of description, SKUs, model numbers. */
  searchText: string;
  createdAtMs: number;
  /** Units sold in confirmed orders, for the "Best sellers" sort. */
  popularity: number;
  isFeatured: boolean;
};

export type SortKey = "recommended" | "newest" | "popular" | "price-asc" | "price-desc" | "name";

export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Best selling" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

export type ShopParams = {
  q: string;
  category: string | null;
  brands: string[];
  /** Price bounds in cents (VAT-inclusive), null = unbounded. */
  minCents: number | null;
  maxCents: number | null;
  inStock: boolean;
  sort: SortKey;
  page: number;
};

export type Facets = {
  categories: Array<{ slug: string; count: number }>;
  brands: Array<{ name: string; count: number }>;
};

export type ShopResult = {
  items: CatalogueRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  facets: Facets;
};

/** Slug of the category that is derived from compare-at prices rather than manual tagging. */
export const SPECIAL_OFFERS_SLUG = "special-offers";

/**
 * Virtual category for products that have no real category yet, so nothing in the catalogue is
 * reachable only through search. It never exists in the database and is only listed in the shop
 * filter when it has products.
 */
export const OTHER_SLUG = "other";
export const OTHER_NAME = "Other products";

/** A category as the storefront menus and filters see it (built from the database by store-categories.ts). */
export type StoreCategory = {
  slug: string;
  name: string;
  icon?: CategoryIconName;
  /** Slug of the parent category, or null for a top-level one. */
  parentSlug: string | null;
};

/** Stock at or below this shows "Only N left". */
export const LOW_STOCK_THRESHOLD = 5;

export type ProductVariantDetail = {
  id: number;
  name: string;
  sku: string;
  modelNumber: string | null;
  unit: string | null;
  priceCents: number;
  wasCents: number | null;
  stock: number;
};

export type ProductDetail = {
  id: number;
  slug: string;
  name: string;
  brand: string | null;
  description: string | null;
  categories: Array<{ name: string; slug: string }>;
  images: Array<{ url: string; alt: string }>;
  specs: Array<{ name: string; value: string }>;
  variants: ProductVariantDetail[];
};
