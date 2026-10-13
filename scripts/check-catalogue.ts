/**
 * Smoke test for the catalogue's MySQL queries. Run it after `npm run db:migrate && npm run db:seed`:
 *
 *   npm run db:check
 *
 * It loads products through the SAME code the website uses and compares them with prisma/sample-data.ts,
 * so a wrong column, relation or price conversion shows up here instead of in front of a customer.
 * Reads only; changes nothing.
 */
import { SAMPLE_PRODUCTS, slugify } from "../prisma/sample-data";
import { getProductDetail, loadFromDb } from "../src/lib/catalogue";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  -> ${detail}` : ""}`);
  if (!ok) failures++;
};

async function main() {
  if (process.env.USE_MOCK_DATA === "true") {
    throw new Error("Unset USE_MOCK_DATA: this check must read the real database.");
  }

  const rows = await loadFromDb();
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  check("catalogue loads", rows.length > 0, `${rows.length} products`);

  let mismatches: string[] = [];
  for (const s of SAMPLE_PRODUCTS) {
    const r = bySlug.get(slugify(s.name));
    if (!r) {
      mismatches.push(`${s.name}: missing`);
      continue;
    }
    if (r.priceCents !== s.price * 100) mismatches.push(`${s.name}: price ${r.priceCents} != ${s.price * 100}`);
    if ((r.wasCents ?? null) !== (s.was ? s.was * 100 : null)) mismatches.push(`${s.name}: compare-at price differs`);
    if (r.inStock !== s.stock > 0) mismatches.push(`${s.name}: stock status differs`);
    if (!r.categorySlugs.includes(s.category)) mismatches.push(`${s.name}: not in category ${s.category}`);
    if (r.isFeatured !== !!s.featured) mismatches.push(`${s.name}: featured flag differs`);
  }
  check(`all ${SAMPLE_PRODUCTS.length} sample products match the database`, mismatches.length === 0, mismatches.slice(0, 5).join("; "));

  const centrifuge = await getProductDetail("centrifuge-machine");
  check("product detail loads", centrifuge != null);
  if (centrifuge) {
    check("detail has VAT-inclusive price, was-price and stock", centrifuge.variants[0].priceCents === 1_280_000 && centrifuge.variants[0].wasCents === 1_450_000 && centrifuge.variants[0].stock === 5);
    check("detail has its 3 specifications in order", centrifuge.specs.map((x) => x.name).join(",") === "Capacity,Max speed,Timer");
    check("detail has its category", centrifuge.categories[0]?.slug === "laboratory-equipment");
  }
  check("unknown slug returns null", (await getProductDetail("no-such-product")) === null);
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
