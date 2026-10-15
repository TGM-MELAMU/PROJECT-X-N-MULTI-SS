import { ButtonLink } from "@/components/ui/Button";
import { SearchForm } from "@/components/layout/SearchForm";
import { getStoreCategories } from "@/lib/catalogue";

export default async function NotFound() {
  const categories = await getStoreCategories().catch(() => []);
  return (
    <div className="shell py-16 text-center">
      <h1 className="text-3xl">We can't find that page</h1>
      <p className="mx-auto mt-2 max-w-md text-ink-soft">The link may be old, or the product may no longer be available. Search for what you need instead.</p>
      <div className="mx-auto mt-6 max-w-md">
        <SearchForm categories={categories} />
      </div>
      <div className="mt-6 flex justify-center gap-3">
        <ButtonLink href="/shop">Browse all products</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Go to home page
        </ButtonLink>
      </div>
    </div>
  );
}
