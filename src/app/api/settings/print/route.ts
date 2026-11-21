import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { printSettingsSchema, resolvePrintSettings } from "@/lib/print-settings";

/** إعدادات الطباعة: الترويسة، الختم والتوقيع، ونصوص القوالب */
export async function GET() {
  return handle(async () => resolvePrintSettings((await getCurrentUser()).printSettings));
}

export async function PUT(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    const data = printSettingsSchema.parse(await req.json());
    const saved = await prisma.user.update({ where: { id: user.id }, data: { printSettings: data } });
    return resolvePrintSettings(saved.printSettings);
  });
}
