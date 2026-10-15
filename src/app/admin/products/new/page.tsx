import type { Metadata } from "next";
import Link from "next/link";
import { listVendorsForSelect } from "@/lib/admin/queries";
import { one } from "@/lib/admin/links";
import { createProductAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { Card, Flash, Label, SelectInput, TextInput } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Add a product" };

export default async function NewProduct({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const vendors = await listVendorsForSelect();
  return (
    <div className="max-w-xl">
      <p className="mb-2 text-sm"><Link href="/admin/products" className="text-brand-700 underline underline-offset-2">← All products</Link></p>
      <h1 className="text-3xl">Add a product</h1>
      <div className="mt-4"><Flash notice={one(sp.notice)} error={one(sp.error)} /></div>
      <Card>
        <form action={createProductAction} className="space-y-4">
          <div>
            <Label htmlFor="name">Product name</Label>
            <TextInput id="name" name="name" required maxLength={200} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sku" hint="(must be unique)">SKU</Label>
              <TextInput id="sku" name="sku" required maxLength={100} />
            </div>
            <div>
              <Label htmlFor="price" hint="(rand, incl. VAT)">Price</Label>
              <TextInput id="price" name="price" required inputMode="decimal" placeholder="1250.00" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="vendorId">Seller</Label>
              <SelectInput id="vendorId" name="vendorId" required defaultValue="">
                <option value="" disabled>Choose a seller</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.companyName}</option>)}
              </SelectInput>
            </div>
            <div>
              <Label htmlFor="status">Show in the shop?</Label>
              <SelectInput id="status" name="status" defaultValue="draft">
                <option value="draft">Not yet (draft)</option>
                <option value="active">Yes (active)</option>
              </SelectInput>
            </div>
          </div>
          <p className="text-sm text-ink-muted">You add the category, description, photo and stock on the next page. New products start with zero stock.</p>
          <Button type="submit">Create product</Button>
        </form>
      </Card>
    </div>
  );
}
