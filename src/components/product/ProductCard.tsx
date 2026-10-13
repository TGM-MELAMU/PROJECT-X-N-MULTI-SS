import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Price } from "@/components/ui/Price";
import { ShoppingCart } from "lucide-react";
import type { ProductSummary } from "@/lib/catalogue";

export function ProductCard({ product }: { product: ProductSummary }) {
  const href = `/product/${product.slug}`;
  const onSale = product.wasCents != null && product.wasCents > product.priceCents;

  return (
    <article className="group flex flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow hover:shadow-lift">
      <Link href={href} className="relative block aspect-[4/3] bg-surface-muted" tabIndex={-1} aria-hidden>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-brand-300">
            <CategoryIcon name={product.categoryIcon} className="h-14 w-14" />
          </span>
        )}
        <span className="absolute left-2 top-2 flex gap-1">
          {product.isNew && <Badge tone="new">New</Badge>}
          {onSale && <Badge tone="sale">Sale</Badge>}
          {!product.inStock && <Badge tone="neutral">Out of stock</Badge>}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-h-[3.25rem]">
          {product.brand && <p className="text-xs text-ink-muted">{product.brand}</p>}
          <h3 className="text-base font-semibold leading-snug">
            <Link href={href} className="hover:text-brand-700 focus-visible:underline">
              {product.name}
            </Link>
          </h3>
        </div>

        <Price cents={product.priceCents} wasCents={product.wasCents} from={product.multipleVariants} />

        {product.inStock ? (
          // Phase 3/4: becomes a real add-to-cart action; guests are sent to log in first.
          <Link
            href={`/login?next=${encodeURIComponent(href)}`}
            className={buttonClass({ size: "md", className: "mt-auto w-full" })}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            Add to cart
          </Link>
        ) : (
          <span
            className={buttonClass({ variant: "secondary", size: "md", className: "mt-auto w-full opacity-60" })}
            aria-disabled
          >
            Out of stock
          </span>
        )}
      </div>
    </article>
  );
}
