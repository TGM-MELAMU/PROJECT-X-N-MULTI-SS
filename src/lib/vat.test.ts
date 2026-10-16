import { test } from "node:test";
import assert from "node:assert/strict";
import { centsToDecimalString, exclusiveFromInclusive, formatZar, toCents, vatFromInclusive, VAT_RATE_PERCENT } from "./vat";
import { computeTotals } from "./totals";

test("the VAT rate defaults to South Africa's 15%", () => {
  assert.equal(VAT_RATE_PERCENT, 15);
});

test("VAT is the part of a VAT-inclusive price that is tax", () => {
  assert.equal(vatFromInclusive(11500), 1500); // R115.00 incl. = R100.00 + R15.00 VAT
  assert.equal(vatFromInclusive(115000), 15000);
  assert.equal(exclusiveFromInclusive(11500), 10000);
  assert.equal(vatFromInclusive(0), 0);
});

test("VAT rounds to the nearest cent", () => {
  assert.equal(vatFromInclusive(100), 13); // 13.04
  assert.equal(vatFromInclusive(1), 0); // 0.13
  assert.equal(vatFromInclusive(4), 1); // 0.52 rounds up
  assert.equal(vatFromInclusive(999), 130); // 130.30
});

test("excluding VAT and VAT always add back to the inclusive amount", () => {
  for (let cents = 0; cents <= 200_000; cents += 7) {
    assert.equal(exclusiveFromInclusive(cents) + vatFromInclusive(cents), cents, `cents=${cents}`);
  }
});

test("rands from the database become exact cents", () => {
  assert.equal(toCents("19.99"), 1999);
  assert.equal(toCents(19.99), 1999);
  assert.equal(toCents("0.10"), 10);
  assert.equal(toCents("1234567.89"), 123456789);
  assert.equal(toCents({ toString: () => "12800.00" }), 1280000); // Prisma Decimal
  assert.equal(toCents("0"), 0);
});

test("cents go back to a two-decimal string for the database", () => {
  assert.equal(centsToDecimalString(1999), "19.99");
  assert.equal(centsToDecimalString(5), "0.05");
  assert.equal(centsToDecimalString(0), "0.00");
  assert.equal(centsToDecimalString(123456789), "1234567.89");
});

test("rand formatting uses ZAR and two decimals", () => {
  const out = formatZar(1280000).replace(/\s/g, " ");
  assert.match(out, /R/);
  assert.match(out, /12 800,00$/);
});

test("order totals: lines add up, VAT is inside the total, an empty cart is zero", () => {
  const t = computeTotals([
    { unitCents: 1999, quantity: 3 }, // 5997
    { unitCents: 250, quantity: 1 }, // 250
  ]);
  assert.equal(t.itemsCents, 6247);
  assert.equal(t.itemCount, 4);
  assert.equal(t.totalCents, t.itemsCents + t.shippingCents);
  assert.equal(t.vatCents, vatFromInclusive(t.totalCents));

  const empty = computeTotals([]);
  assert.deepEqual([empty.itemsCents, empty.shippingCents, empty.totalCents, empty.vatCents, empty.itemCount], [0, 0, 0, 0, 0]);
});

test("totals do not drift on awkward prices", () => {
  // 0.1 + 0.2 style prices: integer cents keep this exact
  const t = computeTotals([{ unitCents: 10, quantity: 1 }, { unitCents: 20, quantity: 1 }]);
  assert.equal(t.itemsCents, 30);
  const big = computeTotals([{ unitCents: 9_999_999, quantity: 99 }]);
  assert.equal(big.itemsCents, 989_999_901);
});
