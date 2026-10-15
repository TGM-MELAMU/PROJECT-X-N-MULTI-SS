import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductAdmin, listCategoriesAdmin } from "@/lib/admin/queries";
import { APPROVAL_STATUSES, PRODUCT_STATUSES } from "@/lib/admin/validation";
import { one, safeAdminBack } from "@/lib/admin/links";
import {
  addProductImageAction, makePrimaryImageAction, removeProductImageAction, setStockAction, updateProductAction, updateVariantAction,
} from "@/app/actions/admin";
import { toCents } from "@/lib/vat";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/account/ConfirmButton";
import { Card, Flash, Label, SelectInput, TextArea, TextInput } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Edit product" };

const rands = (v: { toString(): string } | null | undefined) => (v == null ? "" : (toCents(v) / 100).toFixed(2));

export default async function AdminProduct({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const sp = await searchParams;
  const [p, categories] = await Promise.all([getProductAdmin(id), listCategoriesAdmin()]);
  if (!p) notFound();

  const listBack = safeAdminBack(one(sp.back), "/admin/products");
  const here = `/admin/products/${p.id}`;
  const chosen = new Set(p.categories.map((c) => c.categoryId));
  // Parents first, each followed by its sub-categories.
  const tops = categories.filter((c) => c.parentCategoryId == null || !categories.some((x) => x.id === c.parentCategoryId));
  const ordered = tops.flatMap((t) => [{ c: t, indent: false }, ...categories.filter((c) => c.parentCategoryId === t.id).map((c) => ({ c, indent: true }))]);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm"><Link href={listBack} className="text-brand-700 underline underline-offset-2">← Back to the product list</Link></p>
        <h1 className="text-3xl">{p.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Sold by {p.vendor.companyName} ·{" "}
          {p.status === "active" && p.approvalStatus === "approved" ? (
            <Link href={`/product/${p.slug}`} className="text-brand-700 underline underline-offset-2">View in the shop</Link>
          ) : (
            "Not visible in the shop (it must be active and approved)"
          )}
        </p>
      </div>
      <Flash notice={one(sp.notice)} error={one(sp.error)} />

      <Card title="Details and categories">
        <form action={updateProductAction} className="space-y-4">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="back" value={here} />
          <div>
            <Label htmlFor="name">Name</Label>
            <TextInput id="name" name="name" defaultValue={p.name} required maxLength={200} />
          </div>
          <div>
            <Label htmlFor="brand">Brand</Label>
            <TextInput id="brand" name="brand" defaultValue={p.brand ?? ""} maxLength={150} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <TextArea id="description" name="description" rows={6} defaultValue={p.description ?? ""} maxLength={10000} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="status">Shop status</Label>
              <SelectInput id="status" name="status" defaultValue={p.status}>
                {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </div>
            <div>
              <Label htmlFor="approvalStatus">Approval</Label>
              <SelectInput id="approvalStatus" name="approvalStatus" defaultValue={p.approvalStatus}>
                {APPROVAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </div>
          </div>
          <div>
            <Label htmlFor="rejectionReason" hint="(only needed when rejected)">Rejection reason</Label>
            <TextInput id="rejectionReason" name="rejectionReason" defaultValue={p.rejectionReason ?? ""} maxLength={500} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={p.isFeatured} /> Show on the home page as a featured product</label>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Categories</legend>
            {categories.length === 0 ? (
              <p className="text-sm text-ink-soft">No categories yet. <Link href="/admin/categories" className="text-brand-700 underline underline-offset-2">Create one</Link>.</p>
            ) : (
              <ul className="grid gap-1 sm:grid-cols-2">
                {ordered.map(({ c, indent }) => (
                  <li key={c.id} className={indent ? "ml-5" : ""}>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="categoryId" value={c.id} defaultChecked={chosen.has(c.id)} />
                      {c.name}{c.status === "inactive" && <span className="text-xs text-ink-muted">(switched off)</span>}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-ink-muted">A product in a sub-category also appears under its parent. Products with no category appear under &quot;Other products&quot;.</p>
          </fieldset>
          <Button type="submit">Save details</Button>
        </form>
      </Card>

      <Card title="Prices and stock">
        <ul className="divide-y divide-line">
          {p.variants.map((v) => (
            <li key={v.id} className="py-4 first:pt-0 last:pb-0">
              <form action={updateVariantAction} className="grid gap-3 sm:grid-cols-6">
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="productId" value={p.id} />
                <input type="hidden" name="back" value={here} />
                <div className="sm:col-span-3">
                  <Label htmlFor={`vn${v.id}`}>Variant name <span className="font-normal text-ink-muted">· SKU {v.sku}</span></Label>
                  <TextInput id={`vn${v.id}`} name="name" defaultValue={v.name} required maxLength={150} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`vm${v.id}`}>Model number</Label>
                  <TextInput id={`vm${v.id}`} name="modelNumber" defaultValue={v.modelNumber ?? ""} maxLength={100} />
                </div>
                <div>
                  <Label htmlFor={`vu${v.id}`}>Unit</Label>
                  <TextInput id={`vu${v.id}`} name="unit" defaultValue={v.unit ?? ""} maxLength={50} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`vp${v.id}`} hint="(rand, incl. VAT)">Price</Label>
                  <TextInput id={`vp${v.id}`} name="price" defaultValue={rands(v.sellingPrice)} required inputMode="decimal" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`vc${v.id}`} hint="(optional)">Was price</Label>
                  <TextInput id={`vc${v.id}`} name="compareAt" defaultValue={rands(v.compareAtPrice)} inputMode="decimal" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`vs${v.id}`}>Status</Label>
                  <SelectInput id={`vs${v.id}`} name="status" defaultValue={v.status}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </SelectInput>
                </div>
                <div className="sm:col-span-6"><Button type="submit" variant="secondary" size="sm">Save price and details</Button></div>
              </form>
              <form action={setStockAction} className="mt-3 flex flex-wrap items-end gap-3 rounded-control bg-surface-muted p-3">
                <input type="hidden" name="variantId" value={v.id} />
                <input type="hidden" name="back" value={here} />
                <div className="w-28">
                  <Label htmlFor={`sq${v.id}`}>In stock</Label>
                  <TextInput id={`sq${v.id}`} name="quantity" defaultValue={v.inventory?.quantityInStock ?? 0} inputMode="numeric" required />
                </div>
                <div className="min-w-40 flex-1">
                  <Label htmlFor={`sn${v.id}`} hint="(optional)">Reason</Label>
                  <TextInput id={`sn${v.id}`} name="note" maxLength={200} placeholder="e.g. Delivery from supplier" />
                </div>
                <Button type="submit" variant="secondary" size="sm">Set stock</Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Photos">
        {p.images.length > 0 && (
          <ul className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {p.images.map((i) => (
              <li key={i.id} className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.imageUrl} alt={i.altText ?? p.name} className="aspect-square w-full rounded-control object-contain ring-1 ring-line" />
                <div className="flex flex-wrap gap-1">
                  {i.isPrimary ? (
                    <span className="text-xs font-semibold text-brand-800">Main photo</span>
                  ) : (
                    <form action={makePrimaryImageAction}>
                      <input type="hidden" name="productId" value={p.id} />
                      <input type="hidden" name="imageId" value={i.id} />
                      <input type="hidden" name="back" value={here} />
                      <Button type="submit" variant="ghost" size="sm">Make main</Button>
                    </form>
                  )}
                  <form action={removeProductImageAction}>
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="imageId" value={i.id} />
                    <input type="hidden" name="back" value={here} />
                    <ConfirmButton message="Remove this photo?" variant="ghost" size="sm">Remove</ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form action={addProductImageAction} className="grid gap-3 sm:grid-cols-6">
          <input type="hidden" name="productId" value={p.id} />
          <input type="hidden" name="back" value={here} />
          <div className="sm:col-span-3">
            <Label htmlFor="url" hint="(link to a hosted image)">Image address</Label>
            <TextInput id="url" name="url" type="url" required placeholder="https://…" maxLength={500} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="alt" hint="(optional)">Description</Label>
            <TextInput id="alt" name="alt" maxLength={255} />
          </div>
          <div className="flex items-end"><Button type="submit" variant="secondary">Add photo</Button></div>
        </form>
        <p className="mt-2 text-xs text-ink-muted">Photos are added by web address for now. Uploading files from this screen is not built yet.</p>
      </Card>
    </div>
  );
}
