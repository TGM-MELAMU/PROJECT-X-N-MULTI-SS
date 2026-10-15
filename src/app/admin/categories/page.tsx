import type { Metadata } from "next";
import { listCategoriesAdmin } from "@/lib/admin/queries";
import { one } from "@/lib/admin/links";
import { createCategoryAction, updateCategoryAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Flash, Label, SelectInput, TextInput } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Categories" };

type Cat = Awaited<ReturnType<typeof listCategoriesAdmin>>[number];

function CategoryFields({ c, all, idp }: { c?: Cat; all: Cat[]; idp: string }) {
  const reserved = c?.slug === "special-offers" || c?.slug === "other";
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-3">
        <Label htmlFor={`${idp}n`}>Name</Label>
        <TextInput id={`${idp}n`} name="name" defaultValue={c?.name ?? ""} required maxLength={100} />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor={`${idp}s`} hint="(web address; leave empty to make it from the name)">Slug</Label>
        <TextInput id={`${idp}s`} name="slug" defaultValue={c?.slug ?? ""} maxLength={120} readOnly={reserved} />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor={`${idp}p`}>Sits inside</Label>
        <SelectInput id={`${idp}p`} name="parentId" defaultValue={c?.parentCategoryId ?? ""}>
          <option value="">Nothing (top-level category)</option>
          {all.filter((x) => x.id !== c?.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </SelectInput>
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor={`${idp}t`}>Status</Label>
        <SelectInput id={`${idp}t`} name="status" defaultValue={c?.status ?? "active"}>
          <option value="active">active (shown in the shop)</option>
          <option value="inactive">inactive (hidden)</option>
        </SelectInput>
      </div>
      <div className="sm:col-span-6">
        <Label htmlFor={`${idp}d`} hint="(optional)">Description</Label>
        <TextInput id={`${idp}d`} name="description" defaultValue={c?.description ?? ""} maxLength={500} />
      </div>
    </div>
  );
}

export default async function AdminCategories({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const cats = await listCategoriesAdmin();
  const nameOf = new Map(cats.map((c) => [c.id, c.name]));
  const tops = cats.filter((c) => c.parentCategoryId == null || !nameOf.has(c.parentCategoryId));
  const rows = tops.flatMap((t) => [t, ...cats.filter((c) => c.parentCategoryId === t.id)]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Categories</h1>
      <Flash notice={one(sp.notice)} error={one(sp.error)} />

      <Card title="Add a category">
        <form action={createCategoryAction} className="space-y-3">
          <input type="hidden" name="back" value="/admin/categories" />
          <CategoryFields all={cats} idp="new" />
          <Button type="submit">Add category</Button>
        </form>
      </Card>

      <Card title={`All categories (${cats.length})`}>
        {cats.length === 0 ? (
          <p className="text-sm text-ink-soft">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((c) => (
              <li key={c.id} className={c.parentCategoryId != null && nameOf.has(c.parentCategoryId) ? "ml-5" : ""}>
                <details className="group py-3">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{c.name}</span>
                    {c.status === "inactive" && <Badge>hidden</Badge>}
                    <span className="text-sm text-ink-muted">{c._count.products.toLocaleString("en-ZA")} {c._count.products === 1 ? "product" : "products"}</span>
                    <span className="ml-auto text-sm text-brand-700 underline underline-offset-2 group-open:hidden">Edit</span>
                  </summary>
                  <form action={updateCategoryAction} className="mt-3 space-y-3">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="back" value="/admin/categories" />
                    <CategoryFields c={c} all={cats} idp={`c${c.id}`} />
                    <Button type="submit" variant="secondary">Save</Button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-ink-muted">
          Categories can&apos;t be deleted here, because products still point at them: switch one off to hide it. &quot;Special Offers&quot; is built in: it lists every product that has a &quot;was&quot; price above its price.
        </p>
      </Card>
    </div>
  );
}
