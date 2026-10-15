"use client";

import { useActionState } from "react";
import { importStockAction, type StockImportState } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";

const initial: StockImportState = {};

export function StockImport() {
  const [s, action, pending] = useActionState(importStockAction, initial);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-ink-soft">
        Upload a CSV with two columns: <strong>SKU</strong> and <strong>quantity</strong> (a header row is optional). Each quantity <em>replaces</em> the current stock for that SKU.
        SKUs that don&apos;t exist are listed back and nothing is created.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" name="file" accept=".csv,text/csv,.txt" required className="text-sm" aria-label="Stock CSV file" />
        <Button type="submit" disabled={pending}>{pending ? "Importing…" : "Import stock"}</Button>
      </div>
      <div aria-live="polite">
        {s.error && <p role="alert" className="rounded-control bg-red-50 px-4 py-3 text-sm text-sale-dark ring-1 ring-inset ring-red-200">{s.error}</p>}
        {s.summary && (
          <div className="rounded-control bg-brand-50 px-4 py-3 text-sm text-brand-900 ring-1 ring-inset ring-brand-200">
            <p className="font-medium">
              {s.summary.updated.toLocaleString("en-ZA")} updated · {s.summary.unchanged.toLocaleString("en-ZA")} already correct ·{" "}
              {s.summary.unknownSkus.toLocaleString("en-ZA")} unknown SKUs · {s.summary.skippedLines.toLocaleString("en-ZA")} lines skipped
            </p>
            {s.unknownSample && s.unknownSample.length > 0 && (
              <p className="mt-1">Unknown SKUs{s.summary.unknownSkus > s.unknownSample.length ? " (first few)" : ""}: {s.unknownSample.join(", ")}</p>
            )}
          </div>
        )}
        {s.problems && s.problems.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-soft">
            {s.problems.map((p, i) => <li key={i}>{p.line ? `Line ${p.line}: ` : ""}{p.message}</li>)}
          </ul>
        )}
      </div>
    </form>
  );
}
