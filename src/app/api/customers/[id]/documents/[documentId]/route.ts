import { db } from "@/lib/db";
import {
  customerActor,
  customerError,
  CustomerError,
} from "@/lib/customer-service";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    await customerActor();
    const { id, documentId } = await params;
    const doc = await db.customerDocument.findFirst({
      where: { id: documentId, customerId: id },
    });
    if (!doc) throw new CustomerError("Document not found", 404);
    return new Response(new Uint8Array(doc.content), {
      headers: {
        "Content-Type": doc.mime,
        "Content-Disposition": 'attachment; filename="' + doc.name + '"',
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return customerError(e);
  }
}
