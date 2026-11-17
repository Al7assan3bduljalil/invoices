import { getCurrentUser } from "@/server/current-user";
import { prisma } from "@/lib/prisma";
import { serializeClient } from "@/server/serialize";
import { ClientsManager } from "./clients-manager";

export default async function ClientsPage() {
  const user = await getCurrentUser();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: "asc" },
  });
  return <ClientsManager clients={clients.map(serializeClient)} />;
}
