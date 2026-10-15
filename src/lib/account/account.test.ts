import test from "node:test";
import assert from "node:assert/strict";
import { OrderStatus } from "@prisma/client";
import { addressSchema, changePasswordSchema, profileSchema } from "./schemas";
import { ORDER_STATUS, pageNumber } from "./order-status";
import { fieldErrors } from "@/lib/auth/schemas";

const goodAddress = { label: "", line1: "1 Main Rd", line2: "", city: "Johannesburg", province: "Gauteng", postalCode: "2000", isDefault: "" };

test("every order status has a customer-facing label", () => {
  for (const s of Object.values(OrderStatus)) {
    assert.ok(ORDER_STATUS[s]?.label, `missing label for ${s}`);
  }
  assert.equal(Object.keys(ORDER_STATUS).length, Object.values(OrderStatus).length);
});

test("pageNumber only returns sane page numbers", () => {
  assert.equal(pageNumber(undefined), 1);
  assert.equal(pageNumber("3"), 3);
  assert.equal(pageNumber(["4", "5"]), 4);
  for (const bad of ["0", "-2", "abc", "", "999999999"]) assert.equal(pageNumber(bad), 1, bad);
});

test("address: a valid South African address passes and trims", () => {
  const r = addressSchema.safeParse({ ...goodAddress, line1: "  1 Main Rd  ", isDefault: "on" });
  assert.ok(r.success);
  assert.equal(r.data.line1, "1 Main Rd");
  assert.equal(r.data.isDefault, true);
  assert.equal(r.data.label, undefined);
  assert.equal(r.data.line2, undefined);
});

test("address: bad postal codes, provinces and blanks are refused with field messages", () => {
  for (const postalCode of ["200", "20000", "ABCD", "2 00", ""]) {
    const r = addressSchema.safeParse({ ...goodAddress, postalCode });
    assert.ok(!r.success, postalCode);
    assert.ok(fieldErrors(r.error).postalCode);
  }
  const prov = addressSchema.safeParse({ ...goodAddress, province: "Narnia" });
  assert.ok(!prov.success && fieldErrors(prov.error).province);
  const blank = addressSchema.safeParse({ ...goodAddress, line1: "   ", city: "" });
  assert.ok(!blank.success);
  const e = fieldErrors(blank.error);
  assert.ok(e.line1 && e.city);
});

test("profile: names required, phone optional but validated", () => {
  assert.ok(profileSchema.safeParse({ firstName: "A", lastName: "B", phone: "" }).success);
  assert.ok(profileSchema.safeParse({ firstName: "A", lastName: "B", phone: "082 123 4567" }).success);
  const bad = profileSchema.safeParse({ firstName: "", lastName: "B", phone: "abc" });
  assert.ok(!bad.success);
  const e = fieldErrors(bad.error);
  assert.ok(e.firstName && e.phone);
});

test("change password: needs a match, a strong enough new password, and a different one", () => {
  const ok = changePasswordSchema.safeParse({ current: "old passphrase 1", password: "new passphrase 2", confirm: "new passphrase 2" });
  assert.ok(ok.success);

  const mismatch = changePasswordSchema.safeParse({ current: "x", password: "new passphrase 2", confirm: "different" });
  assert.ok(!mismatch.success && fieldErrors(mismatch.error).confirm);

  const weak = changePasswordSchema.safeParse({ current: "x", password: "short", confirm: "short" });
  assert.ok(!weak.success && fieldErrors(weak.error).password);

  const same = changePasswordSchema.safeParse({ current: "same passphrase 1", password: "same passphrase 1", confirm: "same passphrase 1" });
  assert.ok(!same.success && /different/.test(fieldErrors(same.error).password));
});
