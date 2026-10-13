import Link from "next/link";
import { categories } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { ShopParams, ShopResult } from "@/lib/catalogue-types";
import { hasActiveFilters, shopHref } from "@/lib/shop-params";

const labelFor = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Filters as a plain GET form: works without JavaScript, and every filtered view is a shareable URL.
 * `idPrefix` keeps ids unique because the panel is rendered twice (inline on desktop, in a drawer on mobile).
 */
export function FilterPanel({
  params,
  facets,
  idPrefix,
}: {
  params: ShopParams;
  facets: ShopResult["facets"];
  idPrefix: string;
}) {
  const visibleCategories = facets.categories.filter((c) => c.count > 0 || c.slug === params.category);
  const selectedBrands = new Set(params.brands.map((b) => b.toLowerCase()));

  return (
    <div>
      <Group title="Category">
        <ul className="space-y-0.5 text-sm">
          <li>
            <Link
              href={shopHref(params, { category: null, page: 1 })}
              aria-current={!params.category ? "true" : undefined}
              className={cn("flex justify-between rounded-control px-2 py-1.5 hover:bg-brand-50", !params.category && "bg-brand-50 font-semibold text-brand-800")}
            >
              All products
            </Link>
          </li>
          {visibleCategories.map((c) => {
            const active = params.category === c.slug;
            return (
              <li key={c.slug}>
                <Link
                  href={shopHref(params, { category: c.slug, page: 1 })}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex items-baseline justify-between gap-2 rounded-control px-2 py-1.5 hover:bg-brand-50",
                    active && "bg-brand-50 font-semibold text-brand-800",
                    c.slug === "special-offers" && !active && "text-sale",
                  )}
                >
                  <span>{labelFor(c.slug)}</span>
                  <span className="nums text-xs text-ink-muted">{c.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Group>

      <form action="/shop" method="get">
        {/* Carry the settings this form doesn't edit. */}
        {params.q && <input type="hidden" name="q" value={params.q} />}
        {params.category && <input type="hidden" name="category" value={params.category} />}
        {params.sort !== "recommended" && <input type="hidden" name="sort" value={params.sort} />}

        {facets.brands.length > 0 && (
          <Group title="Brand">
            <ul className="space-y-1.5 text-sm">
              {facets.brands.map((b) => {
                const id = `${idPrefix}-brand-${b.name.replace(/\W+/g, "-")}`;
                return (
                  <li key={b.name} className="flex items-center gap-2">
                    <input
                      id={id}
                      type="checkbox"
                      name="brand"
                      value={b.name}
                      defaultChecked={selectedBrands.has(b.name.toLowerCase())}
                      className="h-4 w-4 rounded-[0.2rem] border-line-strong accent-brand-700"
                    />
                    <label htmlFor={id} className="flex flex-1 items-baseline justify-between gap-2">
                      <span>{b.name}</span>
                      <span className="nums text-xs text-ink-muted">{b.count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Group>
        )}

        <Group title="Price (incl. VAT)">
          <div className="flex items-center gap-2">
            <label htmlFor={`${idPrefix}-min`} className="sr-only">
              Minimum price in rand
            </label>
            <input
              id={`${idPrefix}-min`}
              name="min"
              inputMode="decimal"
              placeholder="Min"
              defaultValue={params.minCents != null ? String(params.minCents / 100) : ""}
              className="nums h-9 w-full min-w-0 rounded-control border border-line-strong px-2.5 text-sm"
            />
            <span aria-hidden className="text-ink-muted">–</span>
            <label htmlFor={`${idPrefix}-max`} className="sr-only">
              Maximum price in rand
            </label>
            <input
              id={`${idPrefix}-max`}
              name="max"
              inputMode="decimal"
              placeholder="Max"
              defaultValue={params.maxCents != null ? String(params.maxCents / 100) : ""}
              className="nums h-9 w-full min-w-0 rounded-control border border-line-strong px-2.5 text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-ink-muted">Amounts in rand</p>
        </Group>

        <Group title="Availability">
          <div className="flex items-center gap-2 text-sm">
            <input
              id={`${idPrefix}-stock`}
              type="checkbox"
              name="stock"
              value="1"
              defaultChecked={params.inStock}
              className="h-4 w-4 rounded-[0.2rem] border-line-strong accent-brand-700"
            />
            <label htmlFor={`${idPrefix}-stock`}>In stock only</label>
          </div>
        </Group>

        <div className="flex items-center gap-3 border-t border-line pt-4">
          <Button type="submit" size="md" className="flex-1">
            Apply filters
          </Button>
          {hasActiveFilters(params) && (
            <Link href={shopHref({ ...params, q: params.q }, { category: null, brands: [], minCents: null, maxCents: null, inStock: false, page: 1 })} className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline">
              Clear
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
