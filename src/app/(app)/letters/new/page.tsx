export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/current-user";
import { aiEnabled } from "@/server/ai/model";
import { LetterForm } from "@/components/letters/letter-form";

export const metadata = { title: "مراسلة جديدة" };

type Params = { searchParams: Promise<{ direction?: string; clientId?: string }> };

export default async function NewLetterPage({ searchParams }: Params) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return (
    <LetterForm
      clients={clients}
      defaultDirection={sp.direction === "INCOMING" ? "INCOMING" : "OUTGOING"}
      defaultClientId={sp.clientId}
      aiEnabled={aiEnabled()}
    />
  );
}
