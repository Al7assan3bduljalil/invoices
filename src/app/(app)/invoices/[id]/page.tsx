export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/server/current-user";
import { getInvoice } from "@/server/invoices";
import { InvoiceDetail } from "./invoice-detail";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    const invoice = await getInvoice(user.id, id);
    return <InvoiceDetail invoice={invoice} />;
  } catch {
    notFound();
  }
}
