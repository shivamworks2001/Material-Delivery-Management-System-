import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, digest, canManageUsers, userInput } from "../src/lib/security";
test("passwords are salted and verified", () => {
 const one = hashPassword("correct horse battery");
 assert.notEqual(one, hashPassword("correct horse battery"));
 assert.equal(verifyPassword("correct horse battery", one), true);
 assert.equal(verifyPassword("incorrect", one), false);
 assert.equal(verifyPassword("incorrect", "invalid"), false);
});
test("only administrators manage users", () => {
 assert.equal(canManageUsers("ADMIN"), true);
 for (const role of ["OFFICE", "DELIVERY", "", "admin"]) assert.equal(canManageUsers(role), false);
});
test("validation rejects weak passwords and unknown roles", () => {
 const base = { name: "Test User", email: "user@example.com", role: "ADMIN", active: true, password: "long-password-123" };
 assert.equal(userInput.safeParse(base).success, true);
 assert.equal(userInput.safeParse({ ...base, password: "short" }).success, false);
 assert.equal(userInput.safeParse({ ...base, role: "ROOT" }).success, false);
 assert.equal(userInput.safeParse({ ...base, email: "invalid" }).success, false);
 assert.equal(digest("session").length, 64);
});
