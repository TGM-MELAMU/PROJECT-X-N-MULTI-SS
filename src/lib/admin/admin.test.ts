import assert from "node:assert/strict";
import { test } from "node:test";
import { OrderStatus } from "@prisma/client";
import { ORDER_STATUS } from "../account/order-status";
import { appendNote, canTransition, noteLine, ORDER_TRANSITIONS, restocksOnCancel, vendorStatusFor } from "./order-flow";
import {
  categorySchema, imageSchema, MAX_STOCK_CSV_ROWS, newProductSchema, orderStatusSchema, parseRands, parseStockCsv, productSchema,
  slugify, stockSchema, variantSchema,
} from "./validation";

// ───────── order flow ─────────

test("order flow: every status is covered and final statuses go nowhere", () => {
  for (const s of Object.values(OrderStatus)) assert.ok(s in ORDER_TRANSITIONS, `${s} missing`);
  assert.deepEqual(ORDER_TRANSITIONS.completed, []);
  assert.deepEqual(ORDER_TRANSITIONS.cancelled, []);
});

test("order flow: an unpaid order can only be cancelled, never marked paid or shipped by hand", () => {
  for (const from of ["pending_payment", "payment_failed"] as const) {
    assert.ok(canTransition(from, "cancelled"));
    assert.ok(!canTransition(from, "confirmed"));
    assert.ok(!canTransition(from, "processing"));
    assert.ok(!canTransition(from, "completed"));
  }
});

test("order flow: paid orders move forward one step at a time and can't go backwards", () => {
  assert.ok(canTransition("confirmed", "processing"));
  assert.ok(canTransition("processing", "completed"));
  assert.ok(!canTransition("confirmed", "completed"));
  assert.ok(!canTransition("processing", "confirmed"));
  assert.ok(!canTransition("completed", "cancelled"));
});

test("order flow: only paid orders put stock back when cancelled", () => {
  assert.equal(restocksOnCancel("pending_payment"), false);
  assert.equal(restocksOnCancel("payment_failed"), false);
  for (const s of ["new", "confirmed", "processing"] as const) assert.equal(restocksOnCancel(s), true);
});

test("order flow: sellers' orders follow the main order, except for statuses they don't have", () => {
  assert.equal(vendorStatusFor("processing"), "processing");
  assert.equal(vendorStatusFor("cancelled"), "cancelled");
  assert.equal(vendorStatusFor("pending_payment"), null);
});

test("order notes: lines are stamped, and appending never loses earlier notes", () => {
  const line = noteLine(new Date("2026-10-15T06:12:00Z"), "Thato M.", "  Packed and collected ");
  assert.equal(line, "2026/10/15, 08:12 · Thato M. · Packed and collected".replace("2026/10/15, ", "2026/10/15, "), "Johannesburg time (UTC+2)");
  assert.equal(appendNote(null, "a"), "a");
  assert.equal(appendNote("a", "b"), "a\nb");
});

test("every admin-settable order status has a customer-facing label", () => {
  for (const s of orderStatusSchema.shape.to.options) assert.ok(ORDER_STATUS[s].label);
});

// ───────── money ─────────

test("rand amounts: plain numbers, decimals and a decimal comma are accepted; everything else is not", () => {
  assert.equal(parseRands("1250"), 125000);
  assert.equal(parseRands("1250.5"), 125050);
  assert.equal(parseRands("1 250,50"), 125050);
  assert.equal(parseRands("0.99"), 99);
  for (const bad of ["", "R1250", "1,250.50", "-5", "12.345", "abc", "1e5", "9999999999"]) assert.equal(parseRands(bad), null, bad);
  assert.equal(parseRands(null), null);
});

test("variant: price must be positive, and a 'was' price must be higher", () => {
  const base = { id: "1", productId: "2", name: "Standard", status: "active", price: "100" };
  const ok = variantSchema.safeParse({ ...base, compareAt: "150" });
  assert.ok(ok.success);
  if (ok.success) assert.deepEqual([ok.data.priceCents, ok.data.compareAtCents], [10000, 15000]);
  assert.ok(variantSchema.safeParse({ ...base, compareAt: "" }).success);
  assert.equal(variantSchema.safeParse({ ...base, price: "0" }).success, false);
  assert.equal(variantSchema.safeParse({ ...base, price: "abc" }).success, false);
  const same = variantSchema.safeParse({ ...base, compareAt: "100" });
  assert.equal(same.success, false);
  const lower = variantSchema.safeParse({ ...base, compareAt: "50" });
  assert.equal(lower.success, false);
});

// ───────── forms ─────────

test("product form: needs a name, a rejection reason when rejecting, and reads checkboxes and category lists", () => {
  const base = { id: "5", name: "Beaker 500ml", status: "active", approvalStatus: "approved" };
  const ok = productSchema.safeParse({ ...base, brand: "", isFeatured: "on", categoryIds: ["1", "3"] });
  assert.ok(ok.success);
  if (ok.success) {
    assert.equal(ok.data.isFeatured, true);
    assert.equal(ok.data.brand, undefined);
    assert.deepEqual(ok.data.categoryIds, [1, 3]);
  }
  const unchecked = productSchema.safeParse({ ...base });
  assert.ok(unchecked.success && unchecked.data.isFeatured === false && unchecked.data.categoryIds.length === 0);
  assert.equal(productSchema.safeParse({ ...base, name: " " }).success, false);
  assert.equal(productSchema.safeParse({ ...base, approvalStatus: "rejected" }).success, false);
  assert.ok(productSchema.safeParse({ ...base, approvalStatus: "rejected", rejectionReason: "Wrong category" }).success);
  assert.equal(productSchema.safeParse({ ...base, status: "deleted" }).success, false);
});

test("new product: name, SKU, seller and price are required", () => {
  assert.ok(newProductSchema.safeParse({ name: "Funnel", sku: "GLASS-1", vendorId: "3", price: "45", status: "draft" }).success);
  assert.equal(newProductSchema.safeParse({ name: "Funnel", sku: "", vendorId: "3", price: "45", status: "draft" }).success, false);
});

test("category: the web address is made from the name, and reserved or malformed ones are refused", () => {
  const r = categorySchema.safeParse({ name: "Needles & Syringes", slug: "", status: "active" });
  assert.ok(r.success && r.data.slug === "needles-and-syringes");
  assert.equal(categorySchema.safeParse({ name: "Other", status: "active" }).success, false);
  assert.equal(categorySchema.safeParse({ name: "Gloves", slug: "Not Valid!", status: "active" }).success, false);
  assert.ok(categorySchema.safeParse({ name: "Gloves", slug: "gloves", parentId: "2", status: "inactive" }).success);
  assert.equal(slugify("  Café  Équipement / 5L "), "cafe-equipement-5l");
});

test("stock form: whole numbers from 0 up only", () => {
  assert.ok(stockSchema.safeParse({ variantId: "1", quantity: "0" }).success);
  assert.ok(stockSchema.safeParse({ variantId: "1", quantity: "250" }).success);
  for (const q of ["-1", "1.5", "abc", "", "99999999"]) assert.equal(stockSchema.safeParse({ variantId: "1", quantity: q }).success, false, q);
});

test("image form: only http(s) addresses", () => {
  assert.ok(imageSchema.safeParse({ productId: "1", url: "https://cdn.example.com/a.jpg" }).success);
  for (const u of ["javascript:alert(1)", "ftp://x/y.jpg", "not a url", "/local.jpg", ""]) assert.equal(imageSchema.safeParse({ productId: "1", url: u }).success, false, u);
});

// ───────── stock CSV ─────────

test("stock CSV: reads a header row, any column order, and a UTF-8 BOM", () => {
  const r = parseStockCsv("﻿Quantity,SKU,Name\r\n12,AB-1,Beaker\r\n0,AB-2,Flask\r\n");
  assert.deepEqual(r.rows.map((x) => [x.sku, x.quantity]), [["AB-1", 12], ["AB-2", 0]]);
  assert.deepEqual(r.problems, []);
});

test("stock CSV: works without a header and with semicolons or tabs", () => {
  assert.deepEqual(parseStockCsv("AB-1;5\nAB-2;6").rows.map((x) => x.quantity), [5, 6]);
  assert.deepEqual(parseStockCsv("AB-1\t5\nAB-2\t6").rows.map((x) => x.quantity), [5, 6]);
  assert.deepEqual(parseStockCsv('"AB,1",7').rows.map((x) => x.sku), ["AB,1"]);
});

test("stock CSV: bad lines are reported with their line number and the good ones still load", () => {
  const r = parseStockCsv("sku,qty\nAB-1,5\nAB-2,many\n,4\nAB-3,-2\nAB-4,7.0\nAB-5,2.5");
  assert.deepEqual(r.rows.map((x) => x.sku), ["AB-1", "AB-4"]);
  assert.deepEqual(r.problems.map((p) => p.line), [3, 4, 5, 7]);
});

test("stock CSV: a SKU listed twice (in any letter case) is skipped everywhere rather than guessed", () => {
  const r = parseStockCsv("sku,qty\nAB-1,5\nab-1,9\nAB-2,1");
  assert.deepEqual(r.rows.map((x) => x.sku), ["AB-2"]);
  assert.equal(r.problems.length, 2);
});

test("stock CSV: empty files, half-headers and oversized files are refused with a clear message", () => {
  assert.equal(parseStockCsv("").rows.length, 0);
  assert.match(parseStockCsv("sku,name\nA,B").problems[0].message, /SKU column and a quantity column/);
  const big = ["sku,qty", ...Array.from({ length: MAX_STOCK_CSV_ROWS + 1 }, (_, i) => `S${i},1`)].join("\n");
  const r = parseStockCsv(big);
  assert.equal(r.rows.length, 0);
  assert.match(r.problems[0].message, /most is 20/);
});
