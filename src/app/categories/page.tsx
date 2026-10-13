import type { Metadata } from "next";
import Link from "next/link";
import { categories } from "@/config/site";
import { getShopResult } from "@/lib/catalogue";
import { DEFAULT_PARAMS } from "@/lib/shop-params";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  let counts = new Map<string, number>();
  try {
    const { facets } = await getShopResult(DEFAULT_PARAMS);
    counts = new Map(facets.categories.map((c) => [c.slug, c.count]));
  } catch (err) {
    console.error("categories: failed to load counts", err);
  }

  return (
    <div className="shell py-5 md:py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]} />
      <h1 className="mt-4 text-3xl">Categories</h1>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((c) => {
          const n = counts.get(c.slug);
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
