import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  customerActor,
  customerError,
  saveCustomer,
  CustomerError,
} from "@/lib/customer-service";
export async function GET(request: Request) {
  try {
    await customerActor();
    const p = new URL(request.url).searchParams;
    const page = Math.max(1, Number(p.get("page")) || 1);
    const size = 20;
    if (!Number.isInteger(page) || page > 100000)
      throw new CustomerError("Invalid page");
    const q = (p.get("q") || "").trim().slice(0, 200),
      type = p.get("type"),
      category = p.get("category"),
      status = p.get("status");
    const where: Prisma.CustomerWhereInput = {
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      ...(status ? { active: status === "active" } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { gstin: { contains: q, mode: "insensitive" } },
              {
                contact: {
                  is: {
                    OR: [
                      { mobile: { contains: q } },
                      { email: { contains: q, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };
    const sort = p.get("sort");
    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      sort === "name"
        ? { name: "asc" }
        : sort === "code"
          ? { number: "asc" }
          : { createdAt: "desc" };
    const [rows, total, all, active, categories] = await db.$transaction([
      db.customer.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          category: true,
          active: true,
          gstin: true,
          version: true,
          contact: true,
          addresses: { where: { kind: "BILLING" }, select: { city: true } },
        },
        orderBy: [orderBy, { id: "asc" }],
        skip: (page - 1) * size,
        take: size,
      }),
      db.customer.count({ where }),
      db.customer.count(),
      db.customer.count({ where: { active: true } }),
      db.customer.findMany({
        distinct: ["category"],
        select: { category: true },
        where: { category: { not: "" } },
      }),
    ]);
    return Response.json({
      rows,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / size)),
      counts: { total: all, active, inactive: all - active },
      categories: categories.map((c) => c.category),
    });
  } catch (e) {
    return customerError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await customerActor(request);
    const raw = await request.json().catch(() => null);
    const customer = await saveCustomer(raw, actor);
    return Response.json(
      { id: customer.id, code: customer.code },
      { status: 201 },
    );
  } catch (e) {
    return customerError(e);
  }
}
