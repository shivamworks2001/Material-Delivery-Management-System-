import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../src/lib/security";
const db = new PrismaClient();
const base = process.env.APP_ORIGIN!;
if (
  !process.env.DATABASE_URL?.includes("/sunshine_customer_test") ||
  base !== "http://localhost:3001"
)
  throw Error(
    "Use only the isolated sunshine_customer_test database and localhost:3001",
  );
const suffix = randomUUID();
const password = randomUUID();
const users: string[] = [];
const customers: string[] = [];
async function call(path: string, method = "GET", body?: unknown, cookie = "") {
  const response = await fetch(base + path, {
    method,
    headers: {
      origin: base,
      cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
async function account(role: "ADMIN" | "OFFICE" | "DELIVERY") {
  const user = await db.user.create({
    data: {
      name: "Customer Test " + role,
      email: role.toLowerCase() + suffix + "@example.test",
      role,
      passwordHash: hashPassword(password),
    },
  });
  users.push(user.id);
  const response = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { origin: base },
    body: new URLSearchParams({ email: user.email, password }),
    redirect: "manual",
  });
  assert.equal(response.status, 303);
  return response.headers.get("set-cookie")!.split(";")[0];
}
async function main() {
  const admin = await account("ADMIN"),
    office = await account("OFFICE"),
    delivery = await account("DELIVERY");
  assert.equal((await call("/api/customers")).status, 401);
  assert.equal(
    (await call("/api/customers", "GET", undefined, delivery)).status,
    403,
  );
  const payload = {
    type: "Company",
    name: "Test Company " + suffix,
    category: "Engineering",
    contact: {
      person: "Test Contact",
      mobile: "9876543210",
      email: "contact@example.test",
    },
    billing: { line1: "Test billing", city: "Pune", pin: "411001" },
    financial: { terms: "Credit", creditLimit: 50000 },
    locations: [
      {
        name: "North Site",
        address: "North road",
        person: "Receiver",
        mobile: "9876543210",
        isDefault: true,
        active: true,
      },
      { name: "South Site", address: "South road", active: true },
    ],
  };
  const created = await call("/api/customers", "POST", payload, admin);
  assert.equal(created.status, 201, JSON.stringify(created.data));
  customers.push(created.data.id);
  assert.match(created.data.code, /^CUS-\d{6}$/);
  assert.equal(
    (await call("/api/customers", "POST", payload, admin)).status,
    409,
  );
  assert.equal(
    (
      await call(
        "/api/customers",
        "POST",
        { ...payload, name: "Invalid", gstin: "bad" },
        admin,
      )
    ).status,
    400,
  );
  const individual = await call(
    "/api/customers",
    "POST",
    {
      ...payload,
      name: "Individual " + suffix,
      type: "Individual",
      financial: undefined,
      locations: [],
    },
    office,
  );
  assert.equal(individual.status, 201, JSON.stringify(individual.data));
  customers.push(individual.data.id);
  const detail = (
    await call("/api/customers/" + created.data.id, "GET", undefined, admin)
  ).data;
  assert.equal(detail.locations.length, 2);
  assert.equal(
    detail.addresses.find((a: { kind: string }) => a.kind === "SHIPPING").line1,
    "Test billing",
  );
  const officeDetail = (
    await call("/api/customers/" + created.data.id, "GET", undefined, office)
  ).data;
  assert.equal("financial" in officeDetail, false);
  assert.equal(
    (
      await call(
        "/api/customers/" + created.data.id,
        "PUT",
        { ...payload, version: detail.version },
        office,
      )
    ).status,
    403,
  );
  const project = await call(
    "/api/projects",
    "POST",
    { customerId: created.data.id, name: "Project A", active: true },
    admin,
  );
  assert.equal(project.status, 200);
  const update = {
    ...payload,
    version: detail.version,
    locations: [
      {
        ...detail.locations[0],
        projectId: project.data.id,
        address: "Updated address",
      },
    ],
  };
  assert.equal(
    (await call("/api/customers/" + created.data.id, "PUT", update, admin))
      .status,
    200,
  );
  assert.equal(
    (await call("/api/customers/" + created.data.id, "PUT", update, admin))
      .status,
    409,
  );
  const after = (
    await call("/api/customers/" + created.data.id, "GET", undefined, admin)
  ).data;
  assert.equal(after.locations.length, 1);
  assert.equal(
    await db.customerLocation.count({
      where: { customerId: created.data.id, removed: true },
    }),
    1,
  );
  const choices = (
    await call(
      "/api/customer-options?customerId=" +
        created.data.id +
        "&projectId=" +
        project.data.id,
      "GET",
      undefined,
      admin,
    )
  ).data;
  assert.equal(choices.locations[0].person, "Receiver");
  assert.equal(choices.locations[0].address, "Updated address");
  assert.equal(
    (
      await call(
        "/api/customer-options?customerId=" +
          individual.data.id +
          "&projectId=" +
          project.data.id,
        "GET",
        undefined,
        admin,
      )
    ).data.locations.length,
    0,
  );
  for (const q of [
    suffix,
    created.data.code,
    "9876543210",
    "contact@example.test",
  ]) {
    const result = await call(
      "/api/customers?q=" + encodeURIComponent(q),
      "GET",
      undefined,
      admin,
    );
    assert.ok(
      result.data.rows.some((r: { id: string }) => r.id === created.data.id),
    );
  }
  assert.equal(
    (
      await call(
        "/api/customers?type=Individual&q=" + suffix,
        "GET",
        undefined,
        admin,
      )
    ).data.total,
    1,
  );
  assert.equal(
    (await call("/api/customers?page=999", "GET", undefined, admin)).data.rows
      .length,
    0,
  );
  for (let i = 0; i < 21; i++) {
    const extra = await call(
      "/api/customers",
      "POST",
      {
        ...payload,
        name: "Pagination " + suffix + " " + i,
        financial: undefined,
        locations: [],
      },
      office,
    );
    assert.equal(extra.status, 201);
    customers.push(extra.data.id);
  }
  const firstPage = (
    await call(
      "/api/customers?q=Pagination%20" + suffix + "&page=1",
      "GET",
      undefined,
      admin,
    )
  ).data;
  const secondPage = (
    await call(
      "/api/customers?q=Pagination%20" + suffix + "&page=2",
      "GET",
      undefined,
      admin,
    )
  ).data;
  assert.equal(firstPage.rows.length, 20);
  assert.equal(secondPage.rows.length, 1);
  assert.equal(firstPage.pages, 2);
  const deniedOrigin = await fetch(base + "/api/customers", {
    method: "POST",
    headers: {
      origin: "https://wrong.example",
      cookie: admin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  assert.equal(deniedOrigin.status, 403);
  const form = new FormData();
  form.set(
    "file",
    new Blob(["%PDF-1.4\nTest document"], { type: "application/pdf" }),
    "test.pdf",
  );
  const uploaded = await fetch(
    base + "/api/customers/" + created.data.id + "/documents",
    { method: "POST", headers: { origin: base, cookie: admin }, body: form },
  );
  assert.equal(uploaded.status, 201);
  const doc = await uploaded.json();
  const download = await fetch(
    base + "/api/customers/" + created.data.id + "/documents/" + doc.id,
    { headers: { cookie: admin } },
  );
  assert.equal(download.status, 200);
  assert.match(download.headers.get("content-disposition")!, /attachment/);
  assert.equal(
    (
      await call(
        "/api/customers/" + created.data.id,
        "PATCH",
        { active: false, version: after.version },
        office,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        "/api/customers/" + created.data.id,
        "PATCH",
        { active: false, version: after.version },
        admin,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(
        "/api/customer-options?customerId=" + created.data.id,
        "GET",
        undefined,
        admin,
      )
    ).data,
    null,
  );
  const inactive = (
    await call("/api/customers/" + created.data.id, "GET", undefined, admin)
  ).data;
  assert.equal(
    (
      await call(
        "/api/customers/" + created.data.id,
        "PATCH",
        { active: true, version: inactive.version },
        admin,
      )
    ).status,
    200,
  );
  assert.ok(
    (await db.customerHistory.count({
      where: { customerId: created.data.id },
    })) > 3,
  );
  console.log(
    "PASS customer integration: company/individual, duplicate, validation, contacts/addresses, locations, projects, selection, financial permissions, status, search, pagination boundary, private documents, conflict protection and audit.",
  );
}
main().finally(async () => {
  const where = { customerId: { in: customers } };
  await db.customerDocument.deleteMany({ where });
  await db.customerHistory.deleteMany({ where });
  await db.customerLocation.deleteMany({ where });
  await db.customerProject.deleteMany({ where });
  await db.customerFinancial.deleteMany({ where });
  await db.customerAddress.deleteMany({ where });
  await db.customerContact.deleteMany({ where });
  await db.customer.deleteMany({ where: { id: { in: customers } } });
  await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
