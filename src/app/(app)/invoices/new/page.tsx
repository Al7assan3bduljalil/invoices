export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/server/current-user";
import { prisma } from "@/lib/prisma";
import { serializeClient, serializeProduct } from "@/server/serialize";
import { InvoiceForm } from "@/components/invoice/invoice-form";

export default async function NewInvoicePage() {
  const user = await getCurrentUser();
  const [clients, products] = await Promise.all([
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return <InvoiceForm clients={clients.map(serializeClient)} products={products.map(serializeProduct)} />;
}
