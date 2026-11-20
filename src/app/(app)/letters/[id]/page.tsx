export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/current-user";
import { getLetter } from "@/server/letters";
import { aiEnabled } from "@/server/ai/model";
import { LetterForm } from "@/components/letters/letter-form";

export default async function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const letter = await getLetter(user.id, id).catch(() => null);
  if (!letter) notFound();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return <LetterForm key={letter.updatedAt} letter={letter} clients={clients} aiEnabled={aiEnabled()} />;
}
