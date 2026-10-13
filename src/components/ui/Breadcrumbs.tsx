import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.label} className="flex items-center gap-1.5">
              {it.href && !last ? (
                <Link href={it.href} className="hover:text-brand-700 hover:underline underline-offset-4">
                  {it.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-ink" : undefined}>
                  {it.label}
                </span>
              )}
              {!last && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
