import { z } from "zod";
import { INVOICE_STATUSES } from "@/lib/invoice-status";
import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { setInvoiceStatus } from "@/server/invoices";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { status } = z.object({ status: z.enum(INVOICE_STATUSES) }).parse(await req.json());
    return setInvoiceStatus((await getCurrentUser()).id, (await params).id, status);
  });
}
