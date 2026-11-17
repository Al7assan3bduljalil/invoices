import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { serializeClient } from "@/server/serialize";
import { clientSchema } from "@/server/validation";


export async function GET(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const q = new URL(req.url).searchParams.get("q")?.trim();
    const rows = await prisma.client.findMany({
      where: {
        userId: user.id,
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      },
      include: { _count: { select: { invoices: true } } },
      orderBy: { name: "asc" },
    });
    return rows.map(serializeClient);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const data = clientSchema.parse(await req.json());
    const c = await prisma.client.create({ data: { ...data, userId: user.id } });
    return Response.json(serializeClient(c), { status: 201 });
  });
}
