import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/current-user";
import { HttpError, handle } from "@/server/http";
import { serializeProduct } from "@/server/serialize";
import { productSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

async function own(id: string) {
  const user = await getCurrentUser();
  const p = await prisma.product.findFirst({ where: { id, userId: user.id } });
  if (!p) throw new HttpError(404, "المنتج غير موجود");
  return p;
}

export async function GET(_: Request, { params }: Ctx) {
  return handle(async () => serializeProduct(await own((await params).id)));
}

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const p = await own((await params).id);
    const data = productSchema.parse(await req.json());
    return serializeProduct(await prisma.product.update({ where: { id: p.id }, data }));
  });
}

export async function DELETE(_: Request, { params }: Ctx) {
  return handle(async () => {
    const p = await own((await params).id);
    // البنود السابقة تحتفظ بوصفها وسعرها، والربط بالمنتج يصبح فارغاً
    await prisma.product.delete({ where: { id: p.id } });
    return { ok: true };
  });
}
