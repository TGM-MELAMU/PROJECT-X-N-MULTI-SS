import Link from "next/link";
import { X } from "lucide-react";
import { OTHER_NAME, OTHER_SLUG, type ShopParams, type StoreCategory } from "@/lib/catalogue-types";
import { shopHref } from "@/lib/shop-params";
import { formatZar } from "@/lib/vat";

/** One removable chip per applied filter, so people can see and undo what narrowed their results. */
export function ActiveFilters({ params, categories }: { params: ShopParams; categories: StoreCategory[] }) {
  const chips: Array<{ key: string; label: string; href: string }> = [];

  if (params.q) chips.push({ key: "q", label: `Search: “${params.q}”`, href: shopHref(params, { q: "", page: 1 }) });
  if (params.category) {
    const name = params.category === OTHER_SLUG ? OTHER_NAME : (categories.find((c) => c.slug === params.category)?.name ?? params.category);
    chips.push({ key: "category", label: name, href: shopHref(params, { category: null, page: 1 }) });
  }
  for (const b of params.brands) {
    chips.push({ key: `brand-${b}`, label: b, href: shopHref(params, { brands: params.brands.filter((x) => x !== b), page: 1 }) });
  }
  if (params.minCents != null || params.maxCents != null) {
    const label =
      params.minCents != null && params.maxCents != null
        ? `${formatZar(params.minCents)} – ${formatZar(params.maxCents)}`
        : params.minCents != null
          ? `From ${formatZar(params.minCents)}`
          : `Up to ${formatZar(params.maxCents!)}`;
    chips.push({ key: "price", label, href: shopHref(params, { minCents: null, maxCents: null, page: 1 }) });
  }
  if (params.inStock) chips.push({ key: "stock", label: "In stock", href: shopHref(params, { inStock: false, page: 1 }) });

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Applied filters">
      {chips.map((c) => (
        <li key={c.key}>
          <Link
            href={c.href}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-900 ring-1 ring-inset ring-brand-200 hover:bg-brand-100"
          >
            {c.label}
            <X className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Remove filter</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
