import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeInvoice } from "@/server/serialize";
import { invoiceInclude } from "@/server/invoices";
import { PublicInvoiceView } from "@/components/invoice/public-invoice-view";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await prisma.invoice.findUnique({ where: { shareToken: token } });
  if (!inv) return { title: "فاتورة غير موجودة" };
  return { title: `فاتورة ${inv.number}` };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { shareToken: token },
    include: { ...invoiceInclude, user: true },
  });
  if (!inv || inv.status === "DRAFT") notFound();
  const user = await prisma.user.findUnique({ where: { id: inv.userId } });
  return (
    <PublicInvoiceView
      invoice={serializeInvoice(inv)}
      stampUrl={user?.stampUrl ?? null}
      signatureUrl={user?.signatureUrl ?? null}
    />
  );
}
