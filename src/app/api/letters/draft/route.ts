import { generateText } from "ai";
import { z } from "zod";
import { HttpError, handle } from "@/server/http";
import { aiEnabled, getModel } from "@/server/ai/model";
import { BRAND } from "@/components/letterhead/brand";

export const maxDuration = 60;

const schema = z.object({
  subject: z.string().trim().min(1, "اكتب الموضوع أولاً"),
  party: z.string().trim().optional(),
  points: z.string().trim().optional(),
  current: z.string().trim().optional(),
});

/** صياغة نص خطاب رسمي بالذكاء الاصطناعي (يعيد النص فقط ولا يحفظ شيئاً) */
export async function POST(req: Request) {
  return handle(async () => {
    if (!aiEnabled()) throw new HttpError(503, "المساعد الذكي غير مفعّل على الخادم");
    const { subject, party, points, current } = schema.parse(await req.json());
    const { text } = await generateText({
      model: getModel(),
      system:
        `أنت كاتب مراسلات رسمية لشركة "${BRAND.name} ${BRAND.tagline}". ` +
        "اكتب نص متن خطاب رسمي بالعربية الفصحى بأسلوب إداري مهذب وموجز. " +
        "اكتب المتن فقط: بدون الترويسة أو التاريخ أو الرقم الإشاري أو اسم المرسَل إليه أو سطر الموضوع، " +
        'وبدون "تحية طيبة وبعد" وبدون الخاتمة والتوقيع لأنها تضاف تلقائياً. ' +
        "لا تستخدم markdown ولا تخترع أرقاماً أو تواريخ أو مبالغ غير مذكورة.",
      prompt: [
        `الموضوع: ${subject}`,
        party ? `الجهة المرسَل إليها: ${party}` : "",
        points ? `النقاط المطلوب تضمينها:\n${points}` : "",
        current ? `مسودة حالية لتحسينها:\n${current}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    return { body: text.trim() };
  });
}
