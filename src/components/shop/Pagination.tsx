import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ShopParams } from "@/lib/catalogue-types";
import { shopHref } from "@/lib/shop-params";

/** Page numbers with the first, last and a window around the current page; gaps become an ellipsis. */
function pageList(current: number, count: number): Array<number | "gap"> {
  const wanted = new Set([1, count, current - 1, current, current + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

const item = "flex h-10 min-w-10 items-center justify-center rounded-control px-3 text-sm font-medium";

export function Pagination({ params, page, pageCount }: { params: ShopParams; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={shopHref(params, { page: page - 1 })} rel="prev" className={cn(item, "ring-1 ring-inset ring-line-strong hover:bg-brand-50")}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="sr-only">Previous page</span>
        </Link>
      ) : null}

      {pageList(page, pageCount).map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-ink-muted" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={n}
            href={shopHref(params, { page: n })}
            aria-current={n === page ? "page" : undefined}
            className={cn(item, "nums", n === page ? "bg-brand-700 text-white" : "ring-1 ring-inset ring-line-strong hover:bg-brand-50")}
          >
            <span className="sr-only">Page </span>
            {n}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link href={shopHref(params, { page: page + 1 })} rel="next" className={cn(item, "ring-1 ring-inset ring-line-strong hover:bg-brand-50")}>
          <ChevronRight className="h-4 w-4" aria-hidden />
          <span className="sr-only">Next page</span>
        </Link>
      ) : null}
    </nav>
  );
}
