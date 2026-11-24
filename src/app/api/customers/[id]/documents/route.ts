import { db } from "@/lib/db";
import {
  customerActor,
  customerError,
  CustomerError,
} from "@/lib/customer-service";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await customerActor(request);
    const { id } = await params;
    if (!(await db.customer.findUnique({ where: { id } })))
      throw new CustomerError("Customer not found", 404);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > 2 * 1024 * 1024)
      throw new CustomerError("Choose a PDF, JPEG or PNG up to 2 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime =
      bytes.subarray(0, 5).toString() === "%PDF-"
        ? "application/pdf"
        : bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "image/png"
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? "image/jpeg"
            : null;
    if (!mime || file.type !== mime)
      throw new CustomerError(
        "File content must match PDF, JPEG or PNG format.",
      );
    const doc = await db.$transaction(async (tx) => {
      if (
        (await tx.customerDocument.count({ where: { customerId: id } })) >= 20
      )
        throw new CustomerError("Maximum 20 documents per customer.");
      const doc = await tx.customerDocument.create({
        data: {
          customerId: id,
          name: file.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120),
          mime,
          size: bytes.length,
          content: bytes,
          uploadedBy: actor.id,
        },
        select: { id: true },
      });
      await tx.customerHistory.create({
        data: {
          customerId: id,
          actorId: actor.id,
          action: "DOCUMENT_UPLOADED",
        },
      });
      return doc;
    });
    return Response.json(doc, { status: 201 });
  } catch (e) {
    return customerError(e);
  }
}
