"use client";

import { useState } from "react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ProductImage } from "@/components/ui/ProductImage";
import type { CategoryIconName } from "@/config/site";
import { cn } from "@/lib/cn";

export function ProductGallery({
  images,
  fallbackIcon,
}: {
  images: Array<{ url: string; alt: string }>;
  fallbackIcon?: CategoryIconName;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-card bg-surface-muted text-brand-300 md:aspect-square">
        <CategoryIcon name={fallbackIcon} className="h-24 w-24" />
        <span className="sr-only">No product photo available yet</span>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-surface-muted md:aspect-square">
        <ProductImage src={current.url} alt={current.alt} sizes="(min-width: 768px) 50vw, 100vw" priority className="h-full w-full object-contain p-6" />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto" aria-label="Product photos">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "relative h-16 w-16 overflow-hidden rounded-control bg-surface-muted ring-1 ring-inset",
                  i === active ? "ring-2 ring-brand-600" : "ring-line hover:ring-line-strong",
                )}
              >
                <ProductImage src={img.url} alt="" sizes="64px" className="h-full w-full object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
