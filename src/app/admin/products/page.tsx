import type { Metadata } from "next";
import Link from "next/link";
import { listCategoriesAdmin, listProductsAdmin, type ProductFilters } from "@/lib/admin/queries";
import { APPROVAL_STATUSES, PRODUCT_STATUSES } from "@/lib/admin/validation";
import { adminHref, one } from "@/lib/admin/links";
import { pageNumber } from "@/lib/account/order-status";
import { LOW_STOCK_THRESHOLD } from "@/lib/catalogue-types";
import { formatZar, toCents } from "@/lib/vat";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AdminPager, Flash, SelectInput, TextInput } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Products" };

const STOCKS = ["out", "low", "in"] as const;
const oneOf = <T extends string>(v: string, allowed: readonly T[]): T | null => ((allowed as readonly string[]).includes(v) ? (v as T) : null);
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminProducts({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const catRaw = one(sp.category);
  const catNum = Number(catRaw);
  const filters: ProductFilters = {
    q: one(sp.q).trim().slice(0, 100),
    status: oneOf(one(sp.status), PRODUCT_STATUSES),
    approval: oneOf(one(sp.approval), APPROVAL_STATUSES),
    category: catRaw === "none" ? "none" : Number.isInteger(catNum) && catNum > 0 ? catNum : null,
    stock: oneOf(one(sp.stock), STOCKS),
    featured: one(sp.featured) === "1",
    page: pageNumber(sp.page),
  };
  const [{ products, total, page, pageCount }, categories] = await Promise.all([listProductsAdmin(filters), listCategoriesAdmin()]);
  const query = { q: filters.q, status: filters.status, approval: filters.approval, category: filters.category, stock: filters.stock, featured: filters.featured ? "1" : null };
  const anyFilter = Object.values(query).some(Boolean);
  const back = adminHref("/admin/products", query, { page: page > 1 ? page : null });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Products</h1>
        <ButtonLink href="/admin/products/new">Add a product</ButtonLink>
      </div>
      <div className="mt-4"><Flash notice={one(sp.notice)} error={one(sp.error)} /></div>

      <form method="get" className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">Search</label>
          <TextInput id="q" name="q" defaultValue={filters.q} placeholder="Name, brand, SKU or model number" maxLength={100} />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium">Category</label>
          <SelectInput id="category" name="category" defaultValue={catRaw}>
            <option value="">Any category</option>
            <option value="none">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.parentCategoryId ? "– " : ""}{c.name}</option>)}
          </SelectInput>
        </div>
        <div>
          <label htmlFor="stock" className="mb-1 block text-sm font-medium">Stock</label>
          <SelectInput id="stock" name="stock" defaultValue={filters.stock ?? ""}>
            <option value="">Any</option>
            <option value="out">Out of stock</option>
            <option value="low">Low (1 to {LOW_STOCK_THRESHOLD})</option>
            <option value="in">In stock</option>
          </SelectInput>
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium">Status</label>
          <SelectInput id="status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Any</option>
            {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </SelectInput>
        </div>
        <div>
          <label htmlFor="approval" className="mb-1 block text-sm font-medium">Approval</label>
          <SelectInput id="approval" name="approval" defaultValue={filters.approval ?? ""}>
            <option value="">Any</option>
            {APPROVAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </SelectInput>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="featured" value="1" defaultChecked={filters.featured} /> Featured only</label>
        <div className="flex items-end gap-3">
          <Button type="submit">Filter</Button>
          {anyFilter && <Link href="/admin/products" className="py-2 text-sm text-brand-700 underline underline-offset-2">Clear</Link>}
        </div>
      </form>

      <p className="mb-2 text-sm text-ink-muted">{total.toLocaleString("en-ZA")} {total === 1 ? "product" : "products"}</p>

      {products.length === 0 ? (
        <p className="rounded-card bg-surface p-6 text-ink-soft ring-1 ring-line">No products match.</p>
      ) : (
        <div className="overflow-x-auto rounded-card bg-surface shadow-card ring-1 ring-line">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Product</th>
                <th scope="col" className="px-4 py-3">Categories</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">From</th>
                <th scope="col" className="px-4 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => {
                const prices = p.variants.map((v) => toCents(v.sellingPrice));
                const stock = p.variants.reduce((n, v) => n + (v.inventory?.quantityInStock ?? 0), 0);
                return (
                  <tr key={p.id} className="hover:bg-brand-50">
                    <td className="max-w-xs px-4 py-3">
                      <Link href={`/admin/products/${p.id}?back=${encodeURIComponent(back)}`} className="font-medium text-brand-700 underline underline-offset-2">{p.name}</Link>
                      <p className="text-xs text-ink-muted">{p.variants[0]?.sku ?? "No variant"}{p.variants.length > 1 ? ` +${p.variants.length - 1} more` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {p.categories.length ? p.categories.map((c) => c.category.name).join(", ") : <span className="text-amber-800">None</span>}
                    </td>
                    <td className="space-x-1 px-4 py-3">
                      <Badge tone={p.status === "active" ? "new" : "neutral"}>{p.status}</Badge>
                      {p.approvalStatus !== "approved" && <Badge tone={p.approvalStatus === "pending" ? "warning" : "sale"}>{p.approvalStatus}</Badge>}
                      {p.isFeatured && <Badge>featured</Badge>}
                    </td>
                    <td className="nums px-4 py-3 text-right">{prices.length ? formatZar(Math.min(...prices)) : "–"}</td>
                    <td className={`nums px-4 py-3 text-right ${stock === 0 ? "text-sale" : ""}`}>{stock}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <AdminPager path="/admin/products" query={query} page={page} pageCount={pageCount} />
    </div>
  );
}
