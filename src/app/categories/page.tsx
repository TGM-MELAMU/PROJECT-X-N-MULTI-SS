import type { Metadata } from "next";
import Link from "next/link";
import { getShopResult, getStoreCategories } from "@/lib/catalogue";
import { childrenOf, topLevel } from "@/lib/store-categories";
import type { StoreCategory } from "@/lib/catalogue-types";
import { DEFAULT_PARAMS } from "@/lib/shop-params";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  let counts = new Map<string, number>();
  let categories: StoreCategory[] = [];
  try {
    const [{ facets }, list] = await Promise.all([getShopResult(DEFAULT_PARAMS), getStoreCategories()]);
    counts = new Map(facets.categories.map((c) => [c.slug, c.count]));
    categories = list;
  } catch (err) {
    console.error("categories: failed to load", err);
  }
  const other = counts.get("other") ?? 0;

  return (
    <div className="shell py-5 md:py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]} />
      <h1 className="mt-4 text-3xl">Categories</h1>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {topLevel(categories).map((c) => {
          const n = counts.get(c.slug);
          const subs = childrenOf(categories, c.slug).filter((s) => (counts.get(s.slug) ?? 0) > 0);
          return (
            <li key={c.slug}>
              <Link
                href={`/shop?category=${c.slug}`}
                className="flex h-full flex-col items-center gap-3 rounded-card bg-surface p-6 text-center shadow-card transition-shadow hover:shadow-lift"
              >
                <CategoryIcon name={c.icon} className={`h-10 w-10 ${c.slug === "special-offers" ? "text-sale" : "text-brand-600"}`} />
                <span className="font-semibold leading-tight">{c.name}</span>
                {n != null && (
                  <span className="nums text-sm text-ink-muted">
                    {n} {n === 1 ? "product" : "products"}
                  </span>
                )}
              </Link>
              {subs.length > 0 && (
                <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
                  {subs.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/shop?category=${s.slug}`} className="text-brand-700 underline-offset-4 hover:underline">
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
        {other > 0 && (
          <li>
            <Link
              href="/shop?category=other"
              className="flex h-full flex-col items-center gap-3 rounded-card bg-surface p-6 text-center shadow-card transition-shadow hover:shadow-lift"
            >
              <CategoryIcon className="h-10 w-10 text-brand-600" />
              <span className="font-semibold leading-tight">Other products</span>
              <span className="nums text-sm text-ink-muted">{other} {other === 1 ? "product" : "products"}</span>
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
