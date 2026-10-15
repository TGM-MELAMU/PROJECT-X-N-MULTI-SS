import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  amountToCents, buildCheckoutFields, itnSignatureOk, pfAmount, pfEncode, signCheckout,
} from "./payfast";
import { computeTotals, shippingCents } from "./totals";

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

test("pfEncode matches PHP urlencode for the awkward characters", () => {
  assert.equal(pfEncode("MultiSS order MS-1"), "MultiSS+order+MS-1");
  assert.equal(pfEncode("a@b.co.za"), "a%40b.co.za");
  assert.equal(pfEncode("https://x.test/a?b=1&c=2"), "https%3A%2F%2Fx.test%2Fa%3Fb%3D1%26c%3D2");
  assert.equal(pfEncode("it's (ok)!*~"), "it%27s+%28ok%29%21%2A%7E");
  assert.equal(pfEncode("  padded  "), "padded");
});

test("checkout signature: fixed field order, empty values skipped, passphrase last", () => {
  const f = { merchant_id: "10000100", merchant_key: "46f0cd694581a", amount: "100.00", item_name: "Test item", m_payment_id: "A1", name_first: "" };
  // Order is merchant_id, merchant_key, ..., m_payment_id, amount, item_name (not alphabetical, not insertion order)
  const expected = md5("merchant_id=10000100&merchant_key=46f0cd694581a&m_payment_id=A1&amount=100.00&item_name=Test+item&passphrase=secret+pass");
  assert.equal(signCheckout(f, "secret pass"), expected);
  assert.equal(signCheckout(f, ""), md5("merchant_id=10000100&merchant_key=46f0cd694581a&m_payment_id=A1&amount=100.00&item_name=Test+item"));
});

test("buildCheckoutFields puts the signature last and drops empties", () => {
  const out = buildCheckoutFields({ merchant_id: "1", merchant_key: "2", amount: "5.00", item_name: "x", name_first: "" }, "");
  assert.deepEqual(out.map(([k]) => k), ["merchant_id", "merchant_key", "amount", "item_name", "signature"]);
});

test("ITN signature: accepts a genuine one, rejects tampering and missing signature", () => {
  const body: Array<[string, string]> = [
    ["m_payment_id", "MS-261014-ABCDE"], ["pf_payment_id", "1089250"], ["payment_status", "COMPLETE"],
    ["item_name", "MultiSS order"], ["amount_gross", "250.00"], ["name_first", ""], ["email_address", "a@b.co.za"],
  ];
  const qs = body.map(([k, v]) => `${k}=${pfEncode(v)}`).join("&");
  const sig = md5(`${qs}&passphrase=pp`);
  const signed: Array<[string, string]> = [...body, ["signature", sig]];
  assert.ok(itnSignatureOk(signed, "pp"));
  assert.ok(!itnSignatureOk(signed, "other"));
  assert.ok(!itnSignatureOk(signed.map(([k, v]) => (k === "amount_gross" ? [k, "1.00"] : [k, v])) as Array<[string, string]>, "pp"));
  assert.ok(!itnSignatureOk(body, "pp"));
});

test("amounts: two decimals out, strict parsing in", () => {
  assert.equal(pfAmount(12345), "123.45");
  assert.equal(pfAmount(5), "0.05");
  assert.equal(amountToCents("123.45"), 12345);
  assert.equal(amountToCents("100"), 10000);
  assert.equal(amountToCents("1e3"), null);
  assert.equal(amountToCents("-5.00"), null);
  assert.equal(amountToCents("1.234"), null);
  assert.equal(amountToCents(""), null);
});

test("totals: VAT is the portion inside the VAT-inclusive total", () => {
  const t = computeTotals([{ unitCents: 11500, quantity: 2 }, { unitCents: 5750, quantity: 1 }]);
  assert.equal(t.itemsCents, 28750);
  assert.equal(t.totalCents, 28750);
  assert.equal(t.vatCents, 3750);
  assert.equal(t.itemCount, 3);
  assert.equal(computeTotals([]).totalCents, 0);
});

test("shipping: free by default, flat fee and free-over threshold from the environment", () => {
  const keep = { f: process.env.SHIPPING_FLAT_CENTS, o: process.env.SHIPPING_FREE_OVER_CENTS };
  try {
    delete process.env.SHIPPING_FLAT_CENTS; delete process.env.SHIPPING_FREE_OVER_CENTS;
    assert.equal(shippingCents(10000), 0);
    process.env.SHIPPING_FLAT_CENTS = "9900";
    assert.equal(shippingCents(10000), 9900);
    assert.equal(computeTotals([{ unitCents: 10000, quantity: 1 }]).totalCents, 19900);
    process.env.SHIPPING_FREE_OVER_CENTS = "50000";
    assert.equal(shippingCents(49999), 9900);
    assert.equal(shippingCents(50000), 0);
    process.env.SHIPPING_FLAT_CENTS = "junk";
    assert.equal(shippingCents(1), 0);
  } finally {
    keep.f === undefined ? delete process.env.SHIPPING_FLAT_CENTS : (process.env.SHIPPING_FLAT_CENTS = keep.f);
    keep.o === undefined ? delete process.env.SHIPPING_FREE_OVER_CENTS : (process.env.SHIPPING_FREE_OVER_CENTS = keep.o);
  }
});
