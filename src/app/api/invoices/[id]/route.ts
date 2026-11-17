import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { deleteInvoice, getInvoice, updateInvoice } from "@/server/invoices";
import { invoiceSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  return handle(async () => getInvoice((await getCurrentUser()).id, (await params).id));
}

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const user = await getCurrentUser();
    const input = invoiceSchema.parse(await req.json());
    return updateInvoice(user.id, (await params).id, input);
  });
}

export async function DELETE(_: Request, { params }: Ctx) {
  return handle(async () => deleteInvoice((await getCurrentUser()).id, (await params).id));
}
