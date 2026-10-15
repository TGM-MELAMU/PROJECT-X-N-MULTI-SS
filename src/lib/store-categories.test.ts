import assert from "node:assert/strict";
import { test } from "node:test";
import { categories as configured } from "../config/site";
import { applyNewBadgeGuard, pickShowcase, queryCatalogue } from "./catalogue-query";
import { OTHER_SLUG, type CatalogueRow } from "./catalogue-types";
import { DEFAULT_PARAMS } from "./shop-params";
import { buildStoreCategories, categoryLineage, childrenOf, topLevel, type DbCategory } from "./store-categories";

const cat = (id: number, name: string, slug: string, parentId: number | null = null): DbCategory => ({ id, name, slug, parentId });

test("categories: configured ones keep their order, new ones follow A to Z, Special Offers is last", () => {
  const list = buildStoreCategories(
    [cat(1, "Zebra Supplies", "zebra"), cat(2, "Consumables", "consumables"), cat(3, "Apples", "apples"), cat(4, "Laboratory Equipment", "laboratory-equipment")],
    configured,
  );
  assert.deepEqual(list.map((c) => c.slug), ["laboratory-equipment", "consumables", "apples", "zebra", "special-offers"]);
});

test("categories: Special Offers is always offered, even without a database row, and a row never duplicates it", () => {
  assert.equal(buildStoreCategories([], configured).at(-1)?.slug, "special-offers");
  const withRow = buildStoreCategories([cat(9, "Special Offers", "special-offers"), cat(1, "Glassware", "glassware")], configured);
  assert.equal(withRow.filter((c) => c.slug === "special-offers").length, 1);
  assert.equal(withRow.at(-1)?.slug, "special-offers");
});

test("categories: a sub-category knows its parent and borrows its icon", () => {
  const list = buildStoreCategories([cat(1, "Consumables", "consumables"), cat(2, "Gloves", "gloves", 1)], configured);
  const gloves = list.find((c) => c.slug === "gloves")!;
  assert.equal(gloves.parentSlug, "consumables");
  assert.equal(gloves.icon, "pipette");
  assert.deepEqual(topLevel(list).map((c) => c.slug), ["consumables", "special-offers"]);
  assert.deepEqual(childrenOf(list, "consumables").map((c) => c.slug), ["gloves"]);
});

test("categories: a missing or self-referencing parent makes the category top-level instead of hiding it", () => {
  const list = buildStoreCategories([cat(5, "Orphan", "orphan", 99), cat(6, "Loop", "loop", 6)], configured);
  assert.ok(list.filter((c) => c.slug === "orphan" || c.slug === "loop").every((c) => c.parentSlug === null));
});

test("lineage: a category includes its ancestors, and a loop in the data cannot hang it", () => {
  const rows = [cat(1, "A", "a"), cat(2, "B", "b", 1), cat(3, "C", "c", 2)];
  assert.deepEqual(categoryLineage(rows).get("c"), ["c", "b", "a"]);
  const loop = [cat(1, "A", "a", 2), cat(2, "B", "b", 1)];
  assert.deepEqual(categoryLineage(loop).get("a"), ["a", "b"]);
});

const row = (id: number, over: Partial<CatalogueRow> = {}): CatalogueRow => ({
  id, slug: `p${id}`, name: `Product ${id}`, brand: null, imageUrl: null, categorySlug: null, variantId: id,
  priceCents: 1000, wasCents: null, multipleVariants: false, inStock: true, isNew: false, categorySlugs: [],
  searchText: `product ${id}`, createdAtMs: id, popularity: 0, isFeatured: false, ...over,
});

test("Other products: lists anything with no real category, and Special Offers alone doesn't count as a category", () => {
  const rows = [
    row(1, { categorySlug: "glassware", categorySlugs: ["glassware"] }),
    row(2),
    row(3, { categorySlugs: ["special-offers"] }),
  ];
  const r = queryCatalogue(rows, { ...DEFAULT_PARAMS, category: OTHER_SLUG }, ["glassware", "special-offers", OTHER_SLUG]);
  assert.deepEqual(r.items.map((i) => i.id).sort(), [2, 3]);
  assert.equal(r.facets.categories.find((c) => c.slug === OTHER_SLUG)?.count, 2);
});

test("New badge: a bulk import does not mark the whole catalogue as New", () => {
  const bulk = Array.from({ length: 100 }, (_, i) => ({ id: i, isNew: true }));
  assert.ok(applyNewBadgeGuard(bulk).every((r) => !r.isNew));
  const normal = Array.from({ length: 100 }, (_, i) => ({ id: i, isNew: i < 3 }));
  assert.equal(applyNewBadgeGuard(normal).filter((r) => r.isNew).length, 3);
  assert.deepEqual(applyNewBadgeGuard([]), []);
});

test("showcase: in stock first, capped per category, topped up when there are too few categories", () => {
  const rows = [
    ...Array.from({ length: 6 }, (_, i) => row(i + 1, { categorySlug: "a", categorySlugs: ["a"] })),
    row(10, { categorySlug: "b", categorySlugs: ["b"] }),
    row(11, { categorySlug: "c", categorySlugs: ["c"], inStock: false }),
  ];
  const picked = pickShowcase(rows, 4, 2);
  assert.equal(picked.length, 4);
  assert.equal(picked.filter((r) => r.categorySlug === "a").length, 2);
  assert.ok(picked.some((r) => r.id === 10));
  assert.equal(pickShowcase(rows, 20, 1).length, 8); // tops up past the cap, but never returns more than exist
});
