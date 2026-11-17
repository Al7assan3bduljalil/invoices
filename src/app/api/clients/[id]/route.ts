import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/current-user";
import { HttpError, handle } from "@/server/http";
import { serializeClient } from "@/server/serialize";
import { clientSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

async function own(id: string) {
  const user = await getCurrentUser();
  const c = await prisma.client.findFirst({ where: { id, userId: user.id } });
  if (!c) throw new HttpError(404, "العميل غير موجود");
  return c;
}

export async function GET(_: Request, { params }: Ctx) {
  return handle(async () => serializeClient(await own((await params).id)));
}

export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const c = await own((await params).id);
    const data = clientSchema.parse(await req.json());
    return serializeClient(await prisma.client.update({ where: { id: c.id }, data }));
  });
}

export async function DELETE(_: Request, { params }: Ctx) {
  return handle(async () => {
    const c = await own((await params).id);
    const used = await prisma.invoice.count({ where: { clientId: c.id } });
    if (used) throw new HttpError(409, `لا يمكن حذف العميل لوجود ${used} فاتورة مرتبطة به`);
    await prisma.client.delete({ where: { id: c.id } });
    return { ok: true };
  });
}
