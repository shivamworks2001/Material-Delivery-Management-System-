import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { currentUser, sameOrigin } from "./auth";
import {
  customerPermissions,
  customerSchema,
  duplicateKey,
} from "./customer-validation";
export class CustomerError extends Error {
  constructor(
    message: string,
    public status = 400,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export async function customerActor(request?: Request) {
  if (request && request.method !== "GET" && !sameOrigin(request))
    throw new CustomerError("Forbidden", 403);
  const actor = await currentUser();
  if (!actor) throw new CustomerError("Sign in required", 401);
  if (!customerPermissions(actor.role).view)
    throw new CustomerError("Customer access denied", 403);
  return actor;
}
export function customerError(error: unknown) {
  if (error instanceof CustomerError)
    return Response.json(
      { error: error.message, fields: error.fields },
      { status: error.status },
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return Response.json(
        {
          error:
            "A customer with this GSTIN, or the same name and mobile, already exists.",
        },
        { status: 409 },
      );
    if (error.code === "P2025")
      return Response.json(
        { error: "Record not found or changed. Refresh and retry." },
        { status: 409 },
      );
  }
  console.error(
    "Customer operation failed",
    error instanceof Error ? error.name : "Unknown",
  );
  return Response.json(
    { error: "Unable to complete this operation. Please retry." },
    { status: 500 },
  );
}
export async function getCustomer(id: string, role: string) {
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      contact: true,
      addresses: true,
      financial: customerPermissions(role).financial,
      locations: { where: { removed: false }, include: { project: true } },
      projects: true,
      documents: {
        select: { id: true, name: true, size: true, createdAt: true },
      },
      history: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!customer) throw new CustomerError("Customer not found", 404);
  const actors = await db.user.findMany({
    where: {
      id: {
        in: [
          customer.createdBy,
          customer.updatedBy,
          ...customer.history.map((h) => h.actorId),
        ],
      },
    },
    select: { id: true, name: true },
  });
  return { ...customer, actors };
}
export async function saveCustomer(
  raw: unknown,
  actor: { id: string; role: string },
  id?: string,
) {
  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success)
    throw new CustomerError(
      "Please correct the highlighted fields.",
      400,
      Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    );
  const input = parsed.data;
  const permissions = customerPermissions(actor.role);
  if (!permissions.financial && input.financial)
    throw new CustomerError(
      "Financial changes require administrator access.",
      403,
    );
  return db.$transaction(
    async (tx) => {
      const existing = id
        ? await tx.customer.findUnique({ where: { id } })
        : null;
      if (id && !existing) throw new CustomerError("Customer not found", 404);
      if (existing && input.version !== existing.version)
        throw new CustomerError(
          "This customer changed since you opened it. Reload before saving.",
          409,
        );
      if (
        !permissions.status &&
        (existing ? existing.active !== input.active : !input.active)
      )
        throw new CustomerError(
          "Only administrators can change customer status.",
          403,
        );
      const {
        contact,
        billing,
        shipping,
        sameAsBilling,
        locations,
        financial,
        version,
        ...basic
      } = input;
      void version;
      const data = {
        ...basic,
        gstin: basic.gstin || null,
        pan: basic.pan || null,
        legalName: basic.type === "Individual" ? "" : basic.legalName,
        duplicateKey: duplicateKey(basic.name, contact.mobile),
        updatedBy: actor.id,
      };
      let customer;
      if (existing) {
        const changed = await tx.customer.updateMany({
          where: { id, version: input.version },
          data: { ...data, version: { increment: 1 } },
        });
        if (changed.count !== 1)
          throw new CustomerError(
            "Another user saved changes. Reload before saving.",
            409,
          );
        customer = await tx.customer.findUniqueOrThrow({ where: { id } });
      } else {
        const seq = await tx.customerSequence.upsert({
          where: { id: 1 },
          create: { id: 1, value: 1 },
          update: { value: { increment: 1 } },
        });
        customer = await tx.customer.create({
          data: {
            ...data,
            code: "CUS-" + String(seq.value).padStart(6, "0"),
            createdBy: actor.id,
          },
        });
      }
      await tx.customerContact.upsert({
        where: { customerId: customer.id },
        create: { ...contact, customerId: customer.id },
        update: contact,
      });
      for (const [kind, address] of [
        ["BILLING", billing],
        ["SHIPPING", sameAsBilling ? billing : shipping!],
      ] as const) {
        await tx.customerAddress.upsert({
          where: { customerId_kind: { customerId: customer.id, kind } },
          create: { ...address, kind, customerId: customer.id },
          update: address,
        });
      }
      const ids = locations.flatMap((l) => (l.id ? [l.id] : []));
      if (new Set(ids).size !== ids.length)
        throw new CustomerError("Duplicate location IDs");
      if (
        ids.length &&
        (await tx.customerLocation.count({
          where: { id: { in: ids }, customerId: customer.id, removed: false },
        })) !== ids.length
      )
        throw new CustomerError("Invalid location ownership", 400);
      for (const location of locations) {
        if (
          location.projectId &&
          !(await tx.customerProject.findFirst({
            where: { id: location.projectId, customerId: customer.id },
          }))
        )
          throw new CustomerError("Project does not belong to this customer");
      }
      await tx.customerLocation.updateMany({
        where: { customerId: customer.id, id: { notIn: ids } },
        data: { removed: true, active: false, isDefault: false },
      });
      for (const location of locations) {
        const { id: locationId, ...values } = location;
        const locationData = {
          ...values,
          projectId: values.projectId || null,
          isDefault: values.active && values.isDefault,
        };
        if (locationId)
          await tx.customerLocation.update({
            where: { id: locationId },
            data: locationData,
          });
        else
          await tx.customerLocation.create({
            data: { ...locationData, customerId: customer.id },
          });
      }
      if (financial)
        await tx.customerFinancial.upsert({
          where: { customerId: customer.id },
          create: { ...financial, customerId: customer.id },
          update: financial,
        });
      await tx.customerHistory.create({
        data: {
          customerId: customer.id,
          actorId: actor.id,
          action: existing ? "CUSTOMER_UPDATED" : "CUSTOMER_CREATED",
        },
      });
      return customer;
    },
    { timeout: 20000 },
  );
}
