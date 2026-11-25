import { z } from "zod";
import { getCurrentUser } from "@/server/current-user";
import { handle } from "@/server/http";
import { setDueDate } from "@/server/invoices";

type Ctx = { params: Promise<{ id: string }> };

/** تعديل تاريخ الاستحقاق، أو إلغاؤه بإرسال dueDate: null */
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { dueDate } = z
      .object({ dueDate: z.preprocess((v) => (v === "" ? null : v), z.coerce.date().nullable()) })
      .parse(await req.json());
    return setDueDate((await getCurrentUser()).id, (await params).id, dueDate);
  });
}
