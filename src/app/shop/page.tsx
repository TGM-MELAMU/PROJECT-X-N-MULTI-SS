import type { Metadata } from "next";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { getShopResult, getStoreCategories } from "@/lib/catalogue";
import { OTHER_NAME, OTHER_SLUG, type StoreCategory } from "@/lib/catalogue-types";
import { hasActiveFilters, parseShopParams } from "@/lib/shop-params";
import { ActiveFilters } from "@/components/shop/ActiveFilters";
import { FilterPanel } from "@/components/shop/FilterPanel";
import { Pagination } from "@/components/shop/Pagination";
import { SortSelect } from "@/components/shop/SortSelect";
import { ProductCard } from "@/components/product/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const categoryName = (categories: StoreCategory[], slug: string | null) =>
  slug === OTHER_SLUG ? OTHER_NAME : (categories.find((c) => c.slug === slug)?.name ?? null);

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const p = parseShopParams(await searchParams);
  const categories = await getStoreCategories().catch(() => []);
  const title = p.q ? `Search results for “${p.q}”` : (categoryName(categories, p.category) ?? "Shop");
  return {
    title,
    description: `Browse ${categoryName(categories, p.category) ?? "laboratory and medical supplies"} from MultiSS. All prices include VAT.`,
    // Search results and deep filter combinations shouldn't compete with the category pages.
    robots: p.q || p.brands.length || p.minCents != null || p.maxCents != null || p.inStock || p.page > 1 ? { index: false } : undefined,
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = parseShopParams(await searchParams);

  let result;
  let categories: StoreCategory[];
  try {
    [result, categories] = await Promise.all([getShopResult(params), getStoreCategories()]);
  } catch (err) {
    console.error("shop: failed to load products", err);
    return (
      <div className="shell py-16 text-center">
        <h1 className="text-2xl">Products can't load right now</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">Refresh the page. If it keeps happening, contact us and we'll sort it out.</p>
        <ButtonLink href="/shop" className="mt-6">
          Reload shop
        </ButtonLink>
      </div>
    );
  }

  const { items, total, page, pageCount, pageSize, facets } = result;
  const heading = params.q ? `Results for “${params.q}”` : (categoryName(categories, params.category) ?? "All products");
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const filtersOn = hasActiveFilters(params);
  const activeCount = [params.category, params.brands.length, params.minCents ?? params.maxCents, params.inStock].filter(Boolean).length;

  return (
    <div className="shell py-5 md:py-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: params.category || params.q ? "/shop" : undefined },
          ...(params.category ? [{ label: categoryName(categories, params.category) ?? params.category }] : []),
        ]}
      />

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-2xl sm:text-3xl">{heading}</h1>
          <p className="nums mt-1 text-sm text-ink-muted" aria-live="polite">
            {total === 0 ? "No products" : `Showing ${from}–${to} of ${total} ${total === 1 ? "product" : "products"}`}
          </p>
        </div>
        <SortSelect params={params} />
      </div>

      <div className="mt-4 space-y-3">
        {/* Mobile and tablet: filters open in a panel above the results. */}
        <details className="rounded-card bg-surface shadow-card lg:hidden">
          <summary className="flex h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
            {activeCount > 0 && <span className="nums rounded-full bg-brand-700 px-2 py-0.5 text-xs text-white">{activeCount}</span>}
          </summary>
          <div className="border-t border-line p-4">
            <FilterPanel params={params} facets={facets} categories={categories} idPrefix="m" />
          </div>
        </details>
        <ActiveFilters params={params} categories={categories} />
      </div>

      <div className="mt-5 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto pr-1">
            <FilterPanel params={params} facets={facets} categories={categories} idPrefix="d" />
          </div>
        </aside>

        <section aria-label="Products">
          {items.length === 0 ? (
            <div className="rounded-card bg-surface-muted px-6 py-14 text-center">
              <SearchX className="mx-auto h-10 w-10 text-brand-400" strokeWidth={1.5} aria-hidden />
              <h2 className="mt-3 text-lg">No products match{params.q ? ` “${params.q}”` : " these filters"}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
                {filtersOn ? "Try removing a filter or checking the spelling of your search." : "Check back soon: we're adding products."}
              </p>
              {filtersOn && (
                <ButtonLink href="/shop" variant="secondary" className="mt-5">
                  Clear all filters
                </ButtonLink>
              )}
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {items.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Pagination params={params} page={page} pageCount={pageCount} />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
