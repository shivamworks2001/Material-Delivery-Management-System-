import { z } from "zod";
import { db } from "@/lib/db";
import {
  customerActor,
  customerError,
  CustomerError,
} from "@/lib/customer-service";
export async function GET() {
  try {
    await customerActor();
    return Response.json(
      await db.customerProject.findMany({
        include: { customer: { select: { id: true, name: true, code: true } } },
        orderBy: { name: "asc" },
        take: 500,
      }),
    );
  } catch (e) {
    return customerError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await customerActor(request);
    const parsed = z
      .object({
        id: z.string().optional(),
        customerId: z.string(),
        name: z.string().trim().min(2).max(200),
        active: z.boolean(),
      })
      .safeParse(await request.json());
    if (!parsed.success)
      throw new CustomerError("Choose a customer and enter a project name.");
    const { id, ...data } = parsed.data;
    const project = await db.$transaction(async (tx) => {
      if (
        !(await tx.customer.findFirst({
          where: { id: data.customerId, active: true },
        }))
      )
        throw new CustomerError("Choose an active customer.");
      if (
        id &&
        !(await tx.customerProject.findFirst({
          where: { id, customerId: data.customerId },
        }))
      )
        throw new CustomerError("Project ownership cannot be changed.");
      const project = id
        ? await tx.customerProject.update({
            where: { id },
            data: { name: data.name, active: data.active },
          })
        : await tx.customerProject.create({ data });
      await tx.customerHistory.create({
        data: {
          customerId: data.customerId,
          actorId: actor.id,
          action: id ? "PROJECT_UPDATED" : "PROJECT_CREATED",
        },
      });
      return project;
    });
    return Response.json(project);
  } catch (e) {
    return customerError(e);
  }
}
