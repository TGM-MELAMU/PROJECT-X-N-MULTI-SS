import type { CategoryIconName } from "@/config/site";
import { SPECIAL_OFFERS_SLUG, type StoreCategory } from "./catalogue-types";

/** A row of the `categories` table (active ones only). */
export type DbCategory = { id: number; parentId: number | null; name: string; slug: string };

type Configured = ReadonlyArray<{ name: string; slug: string; icon: CategoryIconName }>;

/**
 * Turns the categories in the database into the list the menus use.
 *
 * - The database decides WHICH categories exist; src/config/site.ts only decides their ICON and the
 *   ORDER of the well-known ones, so categories added later still show up with no code change.
 * - Well-known categories come first (in config order), then the rest A to Z, and "Special Offers"
 *   is always last. Special Offers is always present because it is derived from compare-at prices.
 * - A category whose parent is missing (for example switched off) is treated as top-level.
 * - A category with no icon of its own uses its parent's.
 */
export function buildStoreCategories(rows: DbCategory[], configured: Configured): StoreCategory[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const order = new Map(configured.map((c, i) => [c.slug, i]));
  const iconOf = new Map(configured.map((c) => [c.slug, c.icon]));

  const list: StoreCategory[] = rows
    .filter((r) => r.slug !== SPECIAL_OFFERS_SLUG)
    .map((r) => {
      const parent = r.parentId != null && r.parentId !== r.id ? byId.get(r.parentId) : undefined;
      return { slug: r.slug, name: r.name, icon: iconOf.get(r.slug), parentSlug: parent?.slug ?? null };
    });

  const rank = (c: StoreCategory) => order.get(c.slug) ?? Number.MAX_SAFE_INTEGER;
  list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "en"));

  const bySlug = new Map(list.map((c) => [c.slug, c]));
  for (const c of list) {
    let p = c.parentSlug ? bySlug.get(c.parentSlug) : undefined;
    for (let hops = 0; !c.icon && p && hops < 10; hops++) {
      c.icon = p.icon;
      p = p.parentSlug ? bySlug.get(p.parentSlug) : undefined;
    }
  }

  const offers = configured.find((c) => c.slug === SPECIAL_OFFERS_SLUG);
  const offersRow = rows.find((r) => r.slug === SPECIAL_OFFERS_SLUG);
  list.push({
    slug: SPECIAL_OFFERS_SLUG,
    name: offersRow?.name ?? offers?.name ?? "Special Offers",
    icon: offers?.icon ?? "tag",
    parentSlug: null,
  });
  return list;
}

/** For each category slug: itself followed by every ancestor, so a product in "Gloves" also counts as in "Consumables". */
export function categoryLineage(rows: DbCategory[]): Map<string, string[]> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out = new Map<string, string[]>();
  for (const r of rows) {
    const chain = [r.slug];
    const seen = new Set([r.id]);
    let p = r.parentId != null ? byId.get(r.parentId) : undefined;
    while (p && !seen.has(p.id)) {
      chain.push(p.slug);
      seen.add(p.id);
      p = p.parentId != null ? byId.get(p.parentId) : undefined;
    }
    out.set(r.slug, chain);
  }
  return out;
}

export const topLevel = (cats: StoreCategory[]) => cats.filter((c) => c.parentSlug === null);
export const childrenOf = (cats: StoreCategory[], slug: string) => cats.filter((c) => c.parentSlug === slug);
