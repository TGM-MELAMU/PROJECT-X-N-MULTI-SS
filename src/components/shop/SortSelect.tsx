"use client";

import { useRef } from "react";
import { SORT_OPTIONS, type ShopParams } from "@/lib/catalogue-types";

/**
 * A GET form with the current filters as hidden fields. With JavaScript it submits as soon as the
 * choice changes; without it, the "Sort" button does the same job.
 */
export function SortSelect({ params }: { params: ShopParams }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action="/shop" method="get" className="flex items-center gap-2">
      {params.q && <input type="hidden" name="q" value={params.q} />}
      {params.category && <input type="hidden" name="category" value={params.category} />}
      {params.brands.map((b) => (
        <input key={b} type="hidden" name="brand" value={b} />
      ))}
      {params.minCents != null && <input type="hidden" name="min" value={params.minCents / 100} />}
      {params.maxCents != null && <input type="hidden" name="max" value={params.maxCents / 100} />}
      {params.inStock && <input type="hidden" name="stock" value="1" />}

      <label htmlFor="sort" className="text-sm text-ink-muted">
        Sort by
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={params.sort}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-10 rounded-control border border-line-strong bg-surface px-3 text-sm"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-10 rounded-control bg-brand-700 px-3 text-sm text-white">
          Sort
        </button>
      </noscript>
    </form>
  );
}
