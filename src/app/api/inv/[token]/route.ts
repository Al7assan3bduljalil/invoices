import { prisma } from "@/lib/prisma";
import { serializeInvoice } from "@/server/serialize";
import { invoiceInclude } from "@/server/invoices";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { shareToken: token },
    include: invoiceInclude,
  });
  if (!inv || inv.status === "DRAFT")
    return Response.json({ error: "الفاتورة غير موجودة أو غير متاحة" }, { status: 404 });
  const user = await prisma.user.findUnique({ where: { id: inv.userId } });
  return Response.json({
    invoice: serializeInvoice(inv),
    stampUrl: user?.stampUrl ?? null,
    signatureUrl: user?.signatureUrl ?? null,
  });
}
