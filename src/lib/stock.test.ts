import { test } from "node:test";
import assert from "node:assert/strict";
import { addedQuantity, isBuyable, lineProblem, stockAfterRestock, stockAfterSale, updatedQuantity } from "./stock";

test("adding to the cart: plain add, cap by stock, cap by the line maximum", () => {
  assert.deepEqual(addedQuantity({ existing: 0, adding: 2, stock: 10, max: 99 }), { next: 2, wanted: 2, capped: false });
  assert.deepEqual(addedQuantity({ existing: 2, adding: 3, stock: 10, max: 99 }), { next: 5, wanted: 5, capped: false });
  // more than is in stock: the cart gets what exists, and the shopper is told
  assert.deepEqual(addedQuantity({ existing: 2, adding: 4, stock: 5, max: 99 }), { next: 5, wanted: 6, capped: true });
  // the per-line maximum applies even when stock is plentiful
  assert.deepEqual(addedQuantity({ existing: 90, adding: 20, stock: 500, max: 99 }), { next: 99, wanted: 110, capped: true });
  // exactly at the limit is not "capped"
  assert.equal(addedQuantity({ existing: 0, adding: 5, stock: 5, max: 99 }).capped, false);
});

test("adding with no stock never produces a negative quantity", () => {
  assert.equal(addedQuantity({ existing: 0, adding: 1, stock: 0, max: 99 }).next, 0);
  assert.equal(addedQuantity({ existing: 0, adding: 1, stock: -3, max: 99 }).next, 0);
});

test("changing a quantity on the cart page is capped, but can always go down to 1", () => {
  assert.equal(updatedQuantity(3, 10, 99), 3);
  assert.equal(updatedQuantity(50, 10, 99), 10);
  assert.equal(updatedQuantity(500, 1000, 99), 99);
  // stock fell to 0 after the item was added: lowering to 1 is still allowed, raising is not
  assert.equal(updatedQuantity(1, 0, 99), 1);
  assert.equal(updatedQuantity(4, 0, 99), 1);
});

test("a cart line is buyable only when live and fully covered by stock", () => {
  assert.equal(isBuyable({ available: true, stock: 5, quantity: 5 }), true);
  assert.equal(isBuyable({ available: true, stock: 5, quantity: 6 }), false);
  assert.equal(isBuyable({ available: true, stock: 0, quantity: 1 }), false);
  assert.equal(isBuyable({ available: false, stock: 50, quantity: 1 }), false);
});

test("checkout explains why a line can't be ordered", () => {
  assert.equal(lineProblem({ name: "Beaker", live: true, stock: 5, quantity: 5 }), null);
  assert.equal(lineProblem({ name: "Beaker", live: true, stock: 9, quantity: 1 }), null);
  assert.equal(lineProblem({ name: "Beaker", live: true, stock: 0, quantity: 1 }), "Beaker is out of stock");
  assert.equal(lineProblem({ name: "Beaker", live: true, stock: 2, quantity: 3 }), "Only 2 of Beaker left");
  assert.equal(lineProblem({ name: "Beaker", live: false, stock: 9, quantity: 1 }), "Beaker is no longer available");
  // withdrawn wins over the stock message
  assert.equal(lineProblem({ name: "Beaker", live: false, stock: 0, quantity: 1 }), "Beaker is no longer available");
});

test("a sale takes stock off, never below zero, and reports the movement", () => {
  assert.deepEqual(stockAfterSale(10, 3), { next: 7, change: -3 });
  assert.deepEqual(stockAfterSale(3, 3), { next: 0, change: -3 });
  // stock was adjusted down between checkout and payment: record what was really taken
  assert.deepEqual(stockAfterSale(2, 5), { next: 0, change: -2 });
  assert.deepEqual(stockAfterSale(0, 5), { next: 0, change: 0 });
});

test("cancelling a paid order puts the stock back", () => {
  assert.deepEqual(stockAfterRestock(7, 3), { next: 10, change: 3 });
  assert.deepEqual(stockAfterRestock(0, 2), { next: 2, change: 2 });
});
