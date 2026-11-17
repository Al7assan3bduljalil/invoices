import { notFound } from "next/navigation";
import { getCurrentUser } from "@/server/current-user";
import { getInvoice } from "@/server/invoices";
import { prisma } from "@/lib/prisma";
import { serializeClient, serializeProduct } from "@/server/serialize";
import { InvoiceForm } from "@/components/invoice/invoice-form";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    const [invoice, clients, products] = await Promise.all([
      getInvoice(user.id, id),
      prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
      prisma.product.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
    ]);
    return <InvoiceForm invoice={invoice} clients={clients.map(serializeClient)} products={products.map(serializeProduct)} />;
  } catch {
    notFound();
  }
}
