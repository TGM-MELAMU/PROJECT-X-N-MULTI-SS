import type { Metadata } from "next";
import Link from "next/link";
import { listStockAdmin, type StockFilters } from "@/lib/admin/queries";
import { adminHref, one } from "@/lib/admin/links";
import { pageNumber } from "@/lib/account/order-status";
import { LOW_STOCK_THRESHOLD } from "@/lib/catalogue-types";
import { setStockAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StockImport } from "@/components/admin/StockImport";
import { AdminPager, Card, Flash, SelectInput, TextInput } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Stock" };

const STOCKS = ["out", "low", "in"] as const;

export default async function AdminStock({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const stockRaw = one(sp.stock);
  const filters: StockFilters = {
    q: one(sp.q).trim().slice(0, 100),
    stock: (STOCKS as readonly string[]).includes(stockRaw) ? (stockRaw as StockFilters["stock"]) : null,
    page: pageNumber(sp.page),
  };
  const { variants, total, page, pageCount } = await listStockAdmin(filters);
  const query = { q: filters.q, stock: filters.stock };
  const back = adminHref("/admin/stock", query, { page });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Stock</h1>
      <Flash notice={one(sp.notice)} error={one(sp.error)} />

      <Card title="Update many at once">
        <StockImport />
      </Card>

      <div>
        <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label htmlFor="q" className="mb-1 block text-sm font-medium">Search</label>
            <TextInput id="q" name="q" defaultValue={filters.q} placeholder="Product name, SKU or model number" maxLength={100} />
          </div>
          <div>
            <label htmlFor="stock" className="mb-1 block text-sm font-medium">Show</label>
            <SelectInput id="stock" name="stock" defaultValue={filters.stock ?? ""}>
              <option value="">All</option>
              <option value="out">Out of stock</option>
              <option value="low">Low (1 to {LOW_STOCK_THRESHOLD})</option>
              <option value="in">In stock</option>
            </SelectInput>
          </div>
          <Button type="submit">Filter</Button>
          {(filters.q || filters.stock) && <Link href="/admin/stock" className="py-2 text-sm text-brand-700 underline underline-offset-2">Clear</Link>}
        </form>

        <p className="mb-2 text-sm text-ink-muted">{total.toLocaleString("en-ZA")} {total === 1 ? "variant" : "variants"}</p>
        {variants.length === 0 ? (
          <p className="rounded-card bg-surface p-6 text-ink-soft ring-1 ring-line">Nothing matches.</p>
        ) : (
          <ul className="divide-y divide-line rounded-card bg-surface shadow-card ring-1 ring-line">
            {variants.map((v) => {
              const qty = v.inventory?.quantityInStock ?? 0;
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <div className="min-w-0 flex-1 basis-60">
                    <Link href={`/admin/products/${v.product.id}`} className="font-medium text-brand-700 underline underline-offset-2">{v.product.name}</Link>
                    <p className="text-xs text-ink-muted">{v.name} · SKU {v.sku}{v.status === "inactive" ? " · variant switched off" : ""}</p>
                  </div>
                  {qty === 0 ? <Badge tone="sale">Out</Badge> : qty <= LOW_STOCK_THRESHOLD ? <Badge tone="warning">Low</Badge> : null}
                  <form action={setStockAction} className="flex items-center gap-2">
                    <input type="hidden" name="variantId" value={v.id} />
                    <input type="hidden" name="back" value={back} />
                    <label htmlFor={`q${v.id}`} className="sr-only">Quantity in stock for {v.sku}</label>
                    <TextInput id={`q${v.id}`} name="quantity" defaultValue={qty} inputMode="numeric" required className="w-24 text-right" />
                    <Button type="submit" variant="secondary" size="sm">Set</Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        <AdminPager path="/admin/stock" query={query} page={page} pageCount={pageCount} />
      </div>
    </div>
  );
}
