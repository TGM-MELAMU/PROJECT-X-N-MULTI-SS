import { test } from "node:test";
import assert from "node:assert/strict";
import { queryCatalogue, PAGE_SIZE } from "./catalogue-query";
import { sampleRows } from "./catalogue-samples";
import { DEFAULT_PARAMS, hasActiveFilters, parseShopParams, shopHref } from "./shop-params";
import type { ShopParams } from "./catalogue-types";
import { categories } from "../config/site";

const rows = sampleRows(Date.UTC(2026, 9, 11));
const slugs = categories.map((c) => c.slug);
const run = (over: Partial<ShopParams> = {}, pageSize = PAGE_SIZE) =>
  queryCatalogue(rows, { ...DEFAULT_PARAMS, ...over }, slugs, pageSize);
const names = (r: ReturnType<typeof run>) => r.items.map((i) => i.name);

// ───────── search ─────────

test("search matches name, case-insensitively", () => {
  assert.deepEqual(names(run({ q: "MICROSCOPE" })), ["Binocular Microscope"]);
});

test("search requires every word, in any order", () => {
  // "pH Buffer Solution Set" matches too: its description says "for pH meters".
  const r = names(run({ q: "meter ph" }));
  assert.deepEqual(new Set(r), new Set(["pH Meter (Digital)", "pH Buffer Solution Set"]));
  // A word that exists in only one of them narrows it down.
  assert.deepEqual(names(run({ q: "meter digital ph" })), ["pH Meter (Digital)"]);
});

test("search finds products by SKU and model number", () => {
  assert.deepEqual(names(run({ q: "lab-cen-001" })), ["Centrifuge Machine"]);
  assert.deepEqual(names(run({ q: "bm-1000" })), ["Binocular Microscope"]);
});

test("search with no match returns an empty page, not an error", () => {
  const r = run({ q: "zzzz-nothing" });
  assert.equal(r.total, 0);
  assert.equal(r.items.length, 0);
  assert.equal(r.pageCount, 1);
});

test("name matches rank above description-only matches", () => {
  // The featured Glassware Set mentions "flasks" only in its description, and would otherwise
  // outrank the Erlenmeyer Flask, whose NAME matches.
  const r = run({ q: "flask" });
  assert.ok(names(r).includes("Laboratory Glassware Set"));
  assert.equal(r.items[0].name, "Erlenmeyer Flask 500 mL");
});

// ───────── filters ─────────

test("category filter keeps only that category", () => {
  const r = run({ category: "glassware" });
  assert.ok(r.total > 0);
  assert.ok(r.items.every((i) => i.categorySlugs.includes("glassware")));
});

test("special-offers is derived from compare-at prices", () => {
  const r = run({ category: "special-offers" }, 100);
  const expected = rows.filter((x) => x.wasCents != null && x.wasCents > x.priceCents).length;
  assert.equal(r.total, expected);
  assert.ok(r.total >= 4);
  assert.ok(r.items.every((i) => i.wasCents! > i.priceCents));
});

test("brand filter is case-insensitive and supports several brands", () => {
  const r = run({ brands: ["optilab", "SPINPRO"] });
  assert.deepEqual(new Set(r.items.map((i) => i.brand)), new Set(["OptiLab", "SpinPro"]));
});

test("price bounds are inclusive", () => {
  const r = run({ minCents: 95_00, maxCents: 120_00 }, 100);
  assert.ok(r.total > 0);
  assert.ok(r.items.every((i) => i.priceCents >= 9500 && i.priceCents <= 12000));
  assert.ok(names(r).includes("Safety Goggles")); // exactly R120.00
});

test("in-stock filter removes sold-out products", () => {
  const all = run({}, 100);
  const inStock = run({ inStock: true }, 100);
  assert.ok(all.items.some((i) => !i.inStock));
  assert.ok(inStock.items.every((i) => i.inStock));
  assert.equal(inStock.total, all.total - all.items.filter((i) => !i.inStock).length);
});

test("filters combine (AND)", () => {
  const r = run({ category: "laboratory-equipment", maxCents: 5000_00, inStock: true }, 100);
  assert.deepEqual(new Set(names(r)), new Set(["Hot Plate Magnetic Stirrer", "pH Meter (Digital)"]));
});

// ───────── facets ─────────

test("category facet counts ignore the category filter itself", () => {
  const r = run({ category: "glassware" });
  const lab = r.facets.categories.find((c) => c.slug === "laboratory-equipment")!;
  assert.equal(lab.count, 4); // still shows what switching category would give
});

test("category facet counts respect the other filters", () => {
  const r = run({ inStock: true });
  const safety = r.facets.categories.find((c) => c.slug === "safety-protection")!;
  assert.equal(safety.count, 2); // 3 products, 1 sold out
});

test("brand facet lists selected brands even when they match nothing", () => {
  const r = run({ category: "furniture", brands: ["OptiLab"] });
  const optilab = r.facets.brands.find((b) => b.name === "OptiLab");
  assert.ok(optilab);
  assert.equal(optilab!.count, 0);
});

// ───────── sorting ─────────

test("price sorts order by price, ties by name", () => {
  const asc = run({ sort: "price-asc" }, 100).items.map((i) => i.priceCents);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  const desc = run({ sort: "price-desc" }, 100).items.map((i) => i.priceCents);
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
});

test("name sort is alphabetical", () => {
  const n = names(run({ sort: "name" }, 100));
  assert.deepEqual(n, [...n].sort((a, b) => a.localeCompare(b, "en")));
});

test("newest and popular sorts follow their fields", () => {
  const newest = run({ sort: "newest" }, 100).items.map((i) => i.createdAtMs);
  assert.deepEqual(newest, [...newest].sort((a, b) => b - a));
  const popular = run({ sort: "popular" }, 100).items.map((i) => i.popularity);
  assert.deepEqual(popular, [...popular].sort((a, b) => b - a));
});

test("recommended puts in-stock products before sold-out ones", () => {
  const items = run({}, 100).items;
  const firstSoldOut = items.findIndex((i) => !i.inStock);
  assert.ok(firstSoldOut > 0);
  assert.ok(items.slice(firstSoldOut).every((i) => !i.inStock));
});

// ───────── pagination ─────────

test("pagination splits results and reports totals", () => {
  const p1 = run({ page: 1 }, 10);
  const p3 = run({ page: 3 }, 10);
  assert.equal(p1.total, rows.length);
  assert.equal(p1.pageCount, Math.ceil(rows.length / 10));
  assert.equal(p1.items.length, 10);
  assert.equal(p3.items.length, rows.length - 20);
});

test("pages do not overlap", () => {
  const a = new Set(run({ page: 1 }, 10).items.map((i) => i.id));
  const b = run({ page: 2 }, 10).items.map((i) => i.id);
  assert.ok(b.every((id) => !a.has(id)));
});

test("a page past the end is clamped to the last page", () => {
  const r = run({ page: 999 }, 10);
  assert.equal(r.page, r.pageCount);
  assert.ok(r.items.length > 0);
});

// ───────── URL parsing ─────────

test("parseShopParams falls back to safe defaults on garbage", () => {
  const p = parseShopParams({ sort: "drop-table", page: "abc", min: "x", max: "-5", stock: "yes" });
  assert.equal(p.sort, "recommended");
  assert.equal(p.page, 1);
  assert.equal(p.minCents, null);
  assert.equal(p.maxCents, null);
  assert.equal(p.inStock, false);
});

test("parseShopParams reads rand amounts and swaps reversed bounds", () => {
  const p = parseShopParams({ min: "1 500,50", max: "100" });
  assert.equal(p.minCents, 10_000);
  assert.equal(p.maxCents, 150_050);
});

test("parseShopParams handles repeated and single brand params", () => {
  assert.deepEqual(parseShopParams({ brand: ["A", "B", "A"] }).brands, ["A", "B"]);
  assert.deepEqual(parseShopParams({ brand: "A" }).brands, ["A"]);
});

test("parseShopParams trims and caps the search text", () => {
  assert.equal(parseShopParams({ q: "  gloves  " }).q, "gloves");
  assert.equal(parseShopParams({ q: "x".repeat(500) }).q.length, 100);
});

test("shopHref omits defaults and round-trips through parseShopParams", () => {
  assert.equal(shopHref(DEFAULT_PARAMS), "/shop");
  const p: ShopParams = {
    q: "flask",
    category: "glassware",
    brands: ["ClearLab"],
    minCents: 10_000,
    maxCents: 50_000,
    inStock: true,
    sort: "price-asc",
    page: 2,
  };
  const url = new URL("http://x" + shopHref(p));
  const raw: Record<string, string | string[]> = {};
  for (const k of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(k);
    raw[k] = all.length > 1 ? all : all[0];
  }
  assert.deepEqual(parseShopParams(raw), p);
});

test("hasActiveFilters ignores sort and page", () => {
  assert.equal(hasActiveFilters({ ...DEFAULT_PARAMS, sort: "name", page: 3 }), false);
  assert.equal(hasActiveFilters({ ...DEFAULT_PARAMS, inStock: true }), true);
});
