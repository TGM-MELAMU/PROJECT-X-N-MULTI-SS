import { SAMPLE_PRODUCTS, slugify } from "../../prisma/sample-data";
import { categories, type CategoryIconName } from "@/config/site";
import type { CatalogueRow, ProductDetail } from "@/lib/catalogue-types";

/**
 * Pure builders that turn prisma/sample-data.ts into catalogue rows and product details.
 * Used by the no-database preview (USE_MOCK_DATA=true) and by the unit tests.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_WINDOW_MS = 30 * DAY_MS;

export function iconFor(slug: string | null): CategoryIconName | undefined {
  return categories.find((c) => c.slug === slug)?.icon;
}

export function sampleRows(now = Date.now()): CatalogueRow[] {
  return SAMPLE_PRODUCTS.map((s, i) => {
    const createdAtMs = now - i * 9 * DAY_MS; // spread over time so only the first few are "new"
    return {
      id: i + 1,
      slug: slugify(s.name),
      name: s.name,
      brand: s.brand,
      imageUrl: null,
      categorySlug: s.category,
      categoryIcon: iconFor(s.category),
      variantId: i + 1,
      priceCents: s.price * 100,
      wasCents: s.was ? s.was * 100 : null,
      multipleVariants: false,
      inStock: s.stock > 0,
      isNew: now - createdAtMs < NEW_WINDOW_MS,
      description: s.desc,
      categorySlugs: [s.category],
      searchText: [s.name, s.brand, s.desc, s.sku, s.model, s.variant].filter(Boolean).join(" ").toLowerCase(),
      createdAtMs,
      popularity: SAMPLE_PRODUCTS.length - i,
      isFeatured: !!s.featured,
    };
  });
}

export function sampleDetail(slug: string): ProductDetail | null {
  const idx = SAMPLE_PRODUCTS.findIndex((s) => slugify(s.name) === slug);
  if (idx < 0) return null;
  const s = SAMPLE_PRODUCTS[idx];
  const cat = categories.find((c) => c.slug === s.category);
  return {
    id: idx + 1,
    slug,
    name: s.name,
    brand: s.brand,
    description: s.desc,
    categories: cat ? [{ name: cat.name, slug: cat.slug }] : [],
    images: [],
    specs: (s.specs ?? []).map(([name, value]) => ({ name, value })),
    variants: [
      {
        id: idx + 1,
        name: s.variant,
        sku: s.sku,
        modelNumber: s.model ?? null,
        unit: "Each",
        priceCents: s.price * 100,
        wasCents: s.was ? s.was * 100 : null,
        stock: s.stock,
      },
    ],
  };
}
