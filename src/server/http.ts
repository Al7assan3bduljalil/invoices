import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

/** يغلّف معالج الطلب ويحوّل الأخطاء إلى ردود JSON واضحة */
export async function handle<T>(fn: () => Promise<T>) {
  try {
    const result = await fn();
    return result instanceof Response ? result : json(result);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    if (err instanceof ZodError)
      return json({ error: "بيانات غير صالحة", issues: err.issues }, 400);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") return json({ error: "العنصر غير موجود" }, 404);
      if (err.code === "P2003")
        return json({ error: "لا يمكن الحذف لوجود فواتير مرتبطة" }, 409);
      if (err.code === "P2002") return json({ error: "القيمة مستخدمة مسبقاً" }, 409);
    }
    console.error(err);
    return json({ error: "حدث خطأ غير متوقع" }, 500);
  }
}
