import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { serializeProduct } from "@/server/serialize";
import { productSchema } from "@/server/validation";


export async function GET(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const q = new URL(req.url).searchParams.get("q")?.trim();
    const rows = await prisma.product.findMany({
      where: {
        userId: user.id,
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      },
      orderBy: { name: "asc" },
    });
    return rows.map(serializeProduct);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const data = productSchema.parse(await req.json());
    const p = await prisma.product.create({ data: { ...data, userId: user.id } });
    return Response.json(serializeProduct(p), { status: 201 });
  });
}
