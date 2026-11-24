import { db } from "@/lib/db";
import {
  customerActor,
  customerError,
  getCustomer,
  saveCustomer,
  CustomerError,
} from "@/lib/customer-service";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const actor = await customerActor();
    return Response.json(await getCustomer((await params).id, actor.role));
  } catch (e) {
    return customerError(e);
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    const actor = await customerActor(request);
    return Response.json(
      await saveCustomer(await request.json(), actor, (await params).id),
    );
  } catch (e) {
    return customerError(e);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await customerActor(request);
    if (actor.role !== "ADMIN")
      throw new CustomerError("Administrator access required", 403);
    const { active, version } = await request.json();
    if (typeof active !== "boolean" || !Number.isInteger(version))
      throw new CustomerError("Invalid status request");
    const { id } = await params;
    await db.$transaction(async (tx) => {
      const updated = await tx.customer.updateMany({
        where: { id, version },
        data: { active, version: { increment: 1 }, updatedBy: actor.id },
      });
      if (updated.count !== 1)
        throw new CustomerError("Customer changed. Refresh and retry.", 409);
      await tx.customerHistory.create({
        data: {
          customerId: id,
          actorId: actor.id,
          action: active ? "ACTIVATED" : "DEACTIVATED",
        },
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return customerError(e);
  }
}
