import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/security";
const db = new PrismaClient();
const base = process.env.APP_ORIGIN || "http://localhost:3000";
const suffix = randomUUID();
const password = randomUUID() + "-Test";
const ids: string[] = [];
async function denied(cookie = "") {
 const response = await fetch(base, { headers: { cookie }, redirect: "manual" });
 if (response.status === 307) { assert.match(response.headers.get("location")!, /login/); return; }
 const html = await response.text();
 assert.match(html, /NEXT_REDIRECT;replace;\/login;307/);
 assert.doesNotMatch(html, /Ready for the work ahead/);
}
async function login(email: string, pass = password) {
 return fetch(base + "/api/auth/login", { method: "POST", headers: { origin: base }, body: new URLSearchParams({ email, password: pass }), redirect: "manual" });
}
async function main() {
 const admin = await db.user.create({ data: { name: "Integration Admin", email: `admin-${suffix}@example.test`, role: "ADMIN", passwordHash: hashPassword(password) } }); ids.push(admin.id);
 const staff = await db.user.create({ data: { name: "Integration Staff", email: `staff-${suffix}@example.test`, role: "DELIVERY", passwordHash: hashPassword(password) } }); ids.push(staff.id);
 await denied();
 assert.equal((await fetch(base + "/api/users", { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: "{}" })).status, 401);
 assert.match((await login(admin.email, "incorrect-password")).headers.get("location")!, /error/);
 const response = await login(admin.email);
 assert.equal(response.status, 303);
 const rawCookie = response.headers.get("set-cookie")!;
 assert.match(rawCookie, /httponly/i); assert.match(rawCookie, /samesite=lax/i);
 const cookie = rawCookie.split(";")[0];
 const dashboard = await fetch(base, { headers: { cookie } }); assert.equal(dashboard.status, 200); assert.match(await dashboard.text(), /Integration/);
 assert.equal((await fetch(base + "/users", { headers: { cookie } })).status, 200);
 const staffCookie = (await login(staff.email)).headers.get("set-cookie")!.split(";")[0];
 const payload = { name: "Updated Staff", email: staff.email, id: staff.id, role: "OFFICE", active: true };
 const save = (body: object, session = cookie, origin = base) => fetch(base + "/api/users", { method: "POST", headers: { cookie: session, origin, "content-type": "application/json" }, body: JSON.stringify(body) });
 assert.equal((await save(payload, staffCookie)).status, 403);
 assert.equal((await save(payload, cookie, "https://other.example")).status, 403);
 assert.equal((await save({ ...payload, email: "invalid" })).status, 400);
 assert.equal((await save(payload)).status, 200);
 await denied(staffCookie);
 const officeCookie = (await login(staff.email)).headers.get("set-cookie")!.split(";")[0];
 assert.equal((await save(payload, officeCookie)).status, 403);
 assert.equal((await save({ ...payload, active: false })).status, 200);
 assert.match((await login(staff.email)).headers.get("location")!, /error/);
 assert.equal((await save({ ...payload, id: admin.id, email: admin.email, role: "DELIVERY" })).status, 400);
 assert.ok(await db.auditLog.count({ where: { actorId: admin.id, action: "USER_UPDATED" } }));
 assert.equal((await fetch(base + "/api/auth/logout", { method: "POST", headers: { cookie, origin: base }, redirect: "manual" })).status, 303);
 await denied(cookie);
 console.log("PASS: authentication, protected pages, anonymous/role denial, CSRF, validation, account changes, revocation, audit trail and logout.");
}
main().finally(async () => {
 await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
 await db.user.deleteMany({ where: { id: { in: ids } } });
 await db.$disconnect();
});
