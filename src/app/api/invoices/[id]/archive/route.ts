import { z } from "zod";
import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { setArchived } from "@/server/invoices";

type Ctx = { params: Promise<{ id: string }> };

/** { archived: true } للأرشفة، { archived: false } للاسترجاع */
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { archived } = z.object({ archived: z.boolean() }).parse(await req.json());
    return setArchived((await getCurrentUser()).id, (await params).id, archived);
  });
}
