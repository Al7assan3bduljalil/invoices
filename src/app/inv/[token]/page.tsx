export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeInvoice } from "@/server/serialize";
import { invoiceInclude } from "@/server/invoices";
import { PublicInvoiceView } from "@/components/invoice/public-invoice-view";
import { parseDocumentKind } from "@/components/letterhead/brand";
import { printContext } from "@/lib/print-settings";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await prisma.invoice.findUnique({ where: { shareToken: token } });
  if (!inv) return { title: "فاتورة غير موجودة" };
  return { title: `فاتورة ${inv.number}` };
}

export default async function SharePage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { token } = await params;
  const kind = parseDocumentKind((await searchParams).type);
  const inv = await prisma.invoice.findUnique({
    where: { shareToken: token },
    include: { ...invoiceInclude, user: true },
  });
  if (!inv || inv.status === "DRAFT") notFound();
  const { settings, assets } = printContext(inv.user);
  return (
    <PublicInvoiceView
      invoice={serializeInvoice(inv)}
      kind={kind}
      settings={settings}
      assets={assets}
    />
  );
}
