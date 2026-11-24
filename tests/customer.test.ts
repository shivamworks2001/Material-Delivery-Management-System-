import test from "node:test";
import assert from "node:assert/strict";
import {
  customerSchema,
  customerPermissions,
  duplicateKey,
} from "../src/lib/customer-validation";
const base = {
  type: "Company",
  name: "Sunshine Test",
  contact: { person: "Receiver", mobile: "9876543210" },
  billing: { line1: "Test road" },
};
test("company and individual validation", () => {
  assert.equal(customerSchema.safeParse(base).success, true);
  assert.equal(
    customerSchema.safeParse({ ...base, type: "Individual" }).success,
    true,
  );
});
test("required contact, mobile and billing fields", () => {
  for (const value of [
    { ...base, name: "" },
    { ...base, contact: { person: "", mobile: "123" } },
    { ...base, billing: { line1: "" } },
  ])
    assert.equal(customerSchema.safeParse(value).success, false);
});
test("GSTIN PAN PIN and email validation", () => {
  for (const value of [
    { ...base, gstin: "invalid" },
    { ...base, pan: "invalid" },
    { ...base, billing: { line1: "Road", pin: "123" } },
    { ...base, contact: { ...base.contact, email: "bad" } },
  ])
    assert.equal(customerSchema.safeParse(value).success, false);
  assert.equal(
    customerSchema.safeParse({
      ...base,
      gstin: "27ABCDE1234F1Z5",
      pan: "ABCDE1234F",
    }).success,
    true,
  );
  assert.equal(
    customerSchema.safeParse({
      ...base,
      gstin: "27ABCDE1234F1Z5",
      pan: "AAAAA1111A",
    }).success,
    false,
  );
});
test("conditional financial and shipping validation", () => {
  assert.equal(
    customerSchema.safeParse({ ...base, sameAsBilling: false }).success,
    false,
  );
  assert.equal(
    customerSchema.safeParse({ ...base, financial: { tds: true } }).success,
    false,
  );
  assert.equal(
    customerSchema.safeParse({ ...base, financial: { terms: "Custom" } })
      .success,
    false,
  );
});
test("permissions and normalized duplicate key", () => {
  assert.equal(customerPermissions("DELIVERY").view, false);
  assert.equal(customerPermissions("OFFICE").financial, false);
  assert.equal(customerPermissions("OFFICE").status, false);
  assert.equal(customerPermissions("ADMIN").financial, true);
  assert.equal(
    duplicateKey(" ACME   Ltd ", "9876543210"),
    duplicateKey("acme ltd", "9876543210"),
  );
});
