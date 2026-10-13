import { Search } from "lucide-react";
import { categories } from "@/config/site";

/** Plain GET form: works without JavaScript and keeps the search URL shareable. */
export function SearchForm({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
    <form action="/shop" role="search" className="flex h-11 w-full overflow-hidden rounded-control bg-surface ring-1 ring-line-strong focus-within:ring-2 focus-within:ring-brand-600">
      <label htmlFor="site-search" className="sr-only">
        Search products, brands and categories
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        defaultValue={defaultQuery}
        placeholder="Search products, brands and categories"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent px-3.5 text-sm outline-none placeholder:text-ink-muted"
      />
      <label htmlFor="site-search-category" className="sr-only">
        Category
      </label>
      <select
        id="site-search-category"
        name="category"
        defaultValue=""
        className="hidden w-44 border-l border-line bg-surface-muted px-3 text-sm text-ink-soft outline-none md:block"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="flex w-12 items-center justify-center bg-brand-700 text-white transition-colors hover:bg-brand-800"
        aria-label="Search"
      >
        <Search className="h-[1.15rem] w-[1.15rem]" aria-hidden />
      </button>
    </form>
  );
}
