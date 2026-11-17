import { z } from "zod";
import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { draftReminder } from "@/server/ai/reminder";

type Ctx = { params: Promise<{ id: string }> };

/** صياغة رسالة تذكير بضغطة زر */
export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const { tone } = z
      .object({ tone: z.enum(["friendly", "firm"]).default("friendly") })
      .parse(body ?? {});
    return draftReminder((await getCurrentUser()).id, (await params).id, tone);
  });
}
