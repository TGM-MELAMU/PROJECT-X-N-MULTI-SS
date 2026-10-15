import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { AddToCart } from "@/components/cart/AddToCart";
import { getProductDetail, getRelatedProducts, getStoreCategories } from "@/lib/catalogue";
import { exclusiveFromInclusive, formatZar } from "@/lib/vat";
import { cn } from "@/lib/cn";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { StockStatus } from "@/components/product/StockStatus";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Price } from "@/components/ui/Price";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const product = await getProductDetail((await params).slug);
  if (!product) return { title: "Product not found" };
  const lowest = Math.min(...product.variants.map((v) => v.priceCents));
  return {
    title: product.name,
    description: `${product.description ?? product.name} From ${formatZar(lowest)} incl. VAT.`.slice(0, 300),
    alternates: { canonical: `/product/${product.slug}` },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) notFound();

  const wanted = (await searchParams).variant;
  const sku = Array.isArray(wanted) ? wanted[0] : wanted;
  // Default to the cheapest variant that is in stock (variants arrive sorted by price).
  const variant =
    product.variants.find((v) => v.sku === sku) ?? product.variants.find((v) => v.stock > 0) ?? product.variants[0];

  const category = product.categories[0] ?? null;
  const storeCategories = await getStoreCategories().catch(() => []);
  const categoryIcon = storeCategories.find((c) => c.slug === category?.slug)?.icon;
  const related = await getRelatedProducts(category?.slug ?? null, product.id);
  const onSale = variant.wasCents != null && variant.wasCents > variant.priceCents;
  const inStock = variant.stock > 0;
  const productHref = `/product/${product.slug}?variant=${encodeURIComponent(variant.sku)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: variant.sku,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(product.description ? { description: product.description } : {}),
    ...(product.images.length ? { image: product.images.map((i) => i.url) } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "ZAR",
      price: (variant.priceCents / 100).toFixed(2),
      valueAddedTaxIncluded: true,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="shell py-5 md:py-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(category ? [{ label: category.name, href: `/shop?category=${category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="mt-5 grid gap-8 md:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} fallbackIcon={categoryIcon} />

        <div>
          {product.brand && <p className="text-sm text-ink-muted">{product.brand}</p>}
          <h1 className="mt-1 text-2xl sm:text-3xl">{product.name}</h1>

          <div className="mt-5 space-y-1">
            <div className="flex items-center gap-2">
              <Price cents={variant.priceCents} wasCents={variant.wasCents} size="lg" showVatNote={false} />
              {onSale && <Badge tone="sale">Sale</Badge>}
            </div>
            <p className="nums text-sm text-ink-muted">
              Includes VAT · {formatZar(exclusiveFromInclusive(variant.priceCents))} excl. VAT
            </p>
          </div>

          {product.variants.length > 1 && (
            <fieldset className="mt-6">
              <legend className="mb-2 text-sm font-semibold">Option</legend>
              <ul className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const selected = v.sku === variant.sku;
                  return (
                    <li key={v.sku}>
                      <Link
                        href={`/product/${product.slug}?variant=${encodeURIComponent(v.sku)}`}
                        scroll={false}
                        aria-current={selected ? "true" : undefined}
                        className={cn(
                          "flex min-h-10 items-center rounded-control px-3.5 text-sm ring-1 ring-inset",
                          selected ? "bg-brand-50 font-semibold text-brand-900 ring-2 ring-brand-600" : "ring-line-strong hover:bg-brand-50",
                          v.stock <= 0 && "text-ink-muted line-through",
                        )}
                      >
                        {v.name}
                        {v.stock <= 0 && <span className="sr-only"> (out of stock)</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )}

          <div className="mt-6 space-y-4 border-y border-line py-5">
            <StockStatus stock={variant.stock} />
            {inStock ? (
              <AddToCart variantId={variant.id} back={productHref} size="lg" withQuantity maxQuantity={variant.stock} />
            ) : (
              <span aria-disabled className={buttonClass({ variant: "secondary", size: "lg", className: "w-full opacity-60 sm:w-auto sm:min-w-64" })}>
                Out of stock
              </span>
            )}
            <p className="flex items-start gap-2 text-sm text-ink-soft">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              <span>
                Need a bulk quote or a part that's out of stock?{" "}
                <Link href={`/contact?product=${encodeURIComponent(product.name)}`} className="font-medium text-brand-700 underline underline-offset-4">
                  Contact our team
                </Link>
                .
              </span>
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-ink-muted">SKU</dt>
            <dd className="nums">{variant.sku}</dd>
            {variant.modelNumber && (
              <>
                <dt className="text-ink-muted">Model</dt>
                <dd className="nums">{variant.modelNumber}</dd>
              </>
            )}
            {variant.unit && (
              <>
                <dt className="text-ink-muted">Sold as</dt>
                <dd>{variant.unit}</dd>
              </>
            )}
            {category && (
              <>
                <dt className="text-ink-muted">Category</dt>
                <dd>
                  <Link href={`/shop?category=${category.slug}`} className="text-brand-700 hover:underline underline-offset-4">
                    {category.name}
                  </Link>
                </dd>
              </>
            )}
          </dl>
        </div>
      </div>

      {(product.description || product.specs.length > 0) && (
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          {product.description && (
            <section aria-labelledby="desc-title">
              <h2 id="desc-title" className="text-xl">
                Description
              </h2>
              <p className="mt-3 max-w-prose whitespace-pre-line text-ink-soft">{product.description}</p>
            </section>
          )}
          {product.specs.length > 0 && (
            <section aria-labelledby="spec-title">
              <h2 id="spec-title" className="text-xl">
                Specifications
              </h2>
              <dl className="mt-3 divide-y divide-line rounded-card ring-1 ring-line">
                {product.specs.map((s) => (
                  <div key={s.name} className="grid grid-cols-[1fr_1.4fr] gap-4 px-4 py-2.5 text-sm odd:bg-surface-muted">
                    <dt className="text-ink-muted">{s.name}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-14">
          <h2 id="related-title" className="mb-4 text-xl">
            More in {category?.name}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* "<" is escaped so product text can never close the script tag. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
