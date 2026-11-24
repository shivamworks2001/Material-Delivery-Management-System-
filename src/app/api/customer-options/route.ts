import { db } from "@/lib/db";
import { customerActor, customerError } from "@/lib/customer-service";
export async function GET(request: Request) {
  try {
    await customerActor();
    const p = new URL(request.url).searchParams;
    const customerId = p.get("customerId"),
      projectId = p.get("projectId"),
      q = (p.get("q") || "").slice(0, 100);
    if (!customerId)
      return Response.json(
        await db.customer.findMany({
          where: {
            active: true,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, code: true, name: true },
          take: 30,
          orderBy: { name: "asc" },
        }),
      );
    const customer = await db.customer.findFirst({
      where: { id: customerId, active: true },
      select: {
        id: true,
        name: true,
        code: true,
        contact: true,
        addresses: true,
        projects: { where: { active: true }, select: { id: true, name: true } },
        locations: {
          where: {
            removed: false,
            active: true,
            ...(projectId
              ? { projectId, project: { active: true } }
              : { projectId: null }),
          },
          select: {
            id: true,
            name: true,
            address: true,
            person: true,
            mobile: true,
            email: true,
            pin: true,
            isDefault: true,
          },
        },
      },
    });
    return Response.json(customer);
  } catch (e) {
    return customerError(e);
  }
}
