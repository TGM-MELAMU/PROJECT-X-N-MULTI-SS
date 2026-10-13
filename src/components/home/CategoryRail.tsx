import Link from "next/link";
import { categories } from "@/config/site";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { cn } from "@/lib/cn";

/** Vertical category list from Prototype 2 (desktop only; smaller screens use the header menu). */
export function CategoryRail({ className }: { className?: string }) {
  return (
    <nav aria-label="Product categories" className={cn("overflow-hidden rounded-card bg-surface shadow-card", className)}>
      <ul>
        {categories.map((c) => {
          const offer = c.slug === "special-offers";
          return (
            <li key={c.slug} className="border-b border-line last:border-b-0">
              <Link
                href={`/shop?category=${c.slug}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-brand-50",
                  offer ? "text-sale" : "text-ink-soft hover:text-brand-800",
                )}
              >
                <CategoryIcon name={c.icon} className={cn("h-5 w-5", offer ? "text-sale" : "text-brand-600")} />
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
