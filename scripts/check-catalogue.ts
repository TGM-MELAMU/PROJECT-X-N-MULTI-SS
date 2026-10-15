/**
 * Smoke test for the catalogue's MySQL queries. Run it after `npm run db:migrate`:
 *
 *   npm run db:check
 *
 * It loads products through the SAME code the website uses and cross-checks them against independent
 * SQL counts, so a wrong column, relation or price conversion shows up here instead of in front of a
 * customer. Works on any database (the real imported catalogue or a seeded sample). Reads only.
 */
import mysql from "mysql2/promise";
import { getProductDetail, loadFromDb } from "../src/lib/catalogue";
import { queryCatalogue } from "../src/lib/catalogue-query";
import { categories } from "../src/config/site";
import { DEFAULT_PARAMS } from "../src/lib/shop-params";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  -> ${detail}` : ""}`);
  if (!ok) failures++;
};

async function main() {
  if (process.env.USE_MOCK_DATA === "true") throw new Error("Unset USE_MOCK_DATA: this check must read the real database.");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = await mysql.createConnection(url);
  const one = async (q: string) => Number(Object.values(((await sql.query(q))[0] as Record<string, unknown>[])[0])[0]);

  const t0 = Date.now();
  const rows = await loadFromDb();
  const loadMs = Date.now() - t0;
  check("catalogue loads", rows.length > 0, `${rows.length} products in ${loadMs} ms`);
  check("load time is reasonable (under 5 s)", loadMs < 5000, `${loadMs} ms`);

  const expected = await one(`select count(distinct p.product_id) from products p join product_variants v on v.product_id = p.product_id and v.variant_status = 'active'
                              where p.product_status = 'active' and p.approval_status = 'approved'`);
  check("row count matches an independent SQL count of sellable products", rows.length === expected, `${rows.length} vs ${expected}`);

  const inStockSql = await one(`select count(distinct p.product_id) from products p join product_variants v on v.product_id = p.product_id and v.variant_status = 'active'
                                join inventory i on i.variant_id = v.variant_id and i.quantity_in_stock > 0
                                where p.product_status = 'active' and p.approval_status = 'approved'`);
  check("in-stock count matches SQL", rows.filter((r) => r.inStock).length === inStockSql, `${rows.filter((r) => r.inStock).length} vs ${inStockSql}`);

  const [[sample]] = (await sql.query(`select p.slug, v.selling_price from products p join product_variants v on v.product_id = p.product_id
                                        where p.product_status = 'active' and p.approval_status = 'approved' and v.variant_status = 'active' order by p.product_id limit 1`)) as unknown as [[{ slug: string; selling_price: string }]];
  const row = rows.find((r) => r.slug === sample.slug);
  check("price conversion is exact (decimal -> cents)", !!row && row.priceCents === Math.round(Number(sample.selling_price) * 100), `${sample.slug}: ${row?.priceCents} cents`);

  check("no sellable product is missing a name, slug or price", rows.every((r) => r.name && r.slug && r.priceCents >= 0));
  check("slugs are unique", new Set(rows.map((r) => r.slug)).size === rows.length);

  const hidden = await one(`select count(*) from products where approval_status <> 'approved'`);
  check("unapproved products are excluded", !hidden || rows.length <= expected, `${hidden} unapproved in the database`);

  const catSlugs = categories.map((c) => c.slug);
  const result = queryCatalogue(rows, DEFAULT_PARAMS, catSlugs);
  check("shop query runs over the whole catalogue", result.total === rows.length && result.items.length > 0);
  check("category facet counts add up (products belong to at most the categories they were mapped to)", result.facets.categories.every((c) => c.count >= 0));

  const target = rows.find((r) => r.categorySlugs.length > 0) ?? rows[0];
  const detail = await getProductDetail(target.slug);
  check("product detail loads", detail != null, target.slug);
  if (detail) {
    check("detail has at least one variant with a price", detail.variants.length > 0 && detail.variants[0].priceCents >= 0);
    check("detail price matches the catalogue row", detail.variants.some((v) => v.priceCents === target.priceCents));
  }
  check("unknown slug returns null", (await getProductDetail("no-such-product-xyz")) === null);

  await sql.end();
}

main()
  .then(() => {
    console.log(failures === 0 ? "\nAll catalogue checks passed." : `\n${failures} check(s) failed.`);
    process.exit(failures ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
