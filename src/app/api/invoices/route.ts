import type { InvoiceStatus } from "@prisma/client";
import { INVOICE_STATUSES } from "@/lib/invoice-status";
import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { createInvoice, listInvoices } from "@/server/invoices";
import { invoiceSchema } from "@/server/validation";


export async function GET(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status");
    return listInvoices(user.id, {
      archived: sp.get("archived") === "true",
      status: INVOICE_STATUSES.includes(status as InvoiceStatus)
        ? (status as InvoiceStatus)
        : undefined,
      clientId: sp.get("clientId") || undefined,
      q: sp.get("q")?.trim() || undefined,
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const input = invoiceSchema.parse(await req.json());
    return Response.json(await createInvoice(user.id, input), { status: 201 });
  });
}
