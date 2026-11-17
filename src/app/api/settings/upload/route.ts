import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";

const schema = z.object({
  field: z.enum(["stampUrl", "signatureUrl"]),
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|jpg|webp);base64,/, "يجب أن يكون data URL لصورة").nullable(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const { field, dataUrl } = schema.parse(await req.json());
    await prisma.user.update({ where: { id: user.id }, data: { [field]: dataUrl } });
    return { ok: true };
  });
}
