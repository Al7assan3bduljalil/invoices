import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/utils";
import { HttpError } from "../http";
import { aiEnabled, getModel } from "./model";

export type ReminderDraft = { to: string | null; subject: string; body: string; aiGenerated: boolean };

/** تحميل بيانات الفاتورة اللازمة لرسالة التذكير */
export async function reminderContext(userId: string, where: { id?: string; number?: string }) {
  const inv = await prisma.invoice.findFirst({
    where: { userId, ...where },
    include: { client: true, user: true },
  });
  if (!inv) throw new HttpError(404, "الفاتورة غير موجودة");
  const daysOverdue = Math.max(
    0,
    inv.dueDate ? Math.floor((Date.now() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
  );
  return {
    invoiceNumber: inv.number,
    status: inv.status,
    clientName: inv.client.name,
    clientEmail: inv.client.email,
    total: formatMoney(Number(inv.total), inv.currency),
    issueDate: formatDate(inv.issueDate),
    dueDate: inv.dueDate ? formatDate(inv.dueDate) : null,
    daysOverdue,
    senderName: inv.user.name,
    companyName: inv.user.companyName ?? inv.user.name,
  };
}

type Ctx = Awaited<ReturnType<typeof reminderContext>>;

function templateReminder(c: Ctx): ReminderDraft {
  return {
    to: c.clientEmail,
    subject: `تذكير ودي بسداد الفاتورة رقم ${c.invoiceNumber}`,
    body: [
      `السادة ${c.clientName} المحترمين،`,
      ``,
      `تحية طيبة وبعد،`,
      ``,
      `نود تذكيركم بأن الفاتورة رقم ${c.invoiceNumber} الصادرة بتاريخ ${c.issueDate} بمبلغ ${c.total} ${c.dueDate ? `قد استحقت بتاريخ ${c.dueDate}` : "ما زالت بانتظار السداد"}${c.daysOverdue ? ` (متأخرة ${c.daysOverdue} يوماً)` : ""}.`,
      ``,
      `نرجو التكرم بإتمام السداد في أقرب وقت ممكن. وإذا كنتم قد قمتم بالسداد بالفعل فيرجى تجاهل هذه الرسالة مع خالص شكرنا.`,
      ``,
      `لأي استفسار يسعدنا تواصلكم معنا.`,
      ``,
      `مع خالص التحية،`,
      `${c.senderName}`,
      `${c.companyName}`,
    ].join("\n"),
    aiGenerated: false,
  };
}

/** صياغة رسالة تذكير احترافية — بالذكاء الاصطناعي إن توفر المفتاح، وإلا بقالب جاهز */
export async function draftReminder(
  userId: string,
  invoiceId: string,
  tone: "friendly" | "firm" = "friendly",
): Promise<ReminderDraft> {
  const c = await reminderContext(userId, { id: invoiceId });
  if (!aiEnabled()) return templateReminder(c);
  try {
    const { text } = await generateText({
      model: getModel(),
      system:
        "أنت مساعد مالي يكتب رسائل بريد إلكتروني احترافية باللغة العربية الفصحى لتذكير العملاء بالفواتير المستحقة. " +
        "أعد النتيجة بالصيغة التالية فقط: السطر الأول يبدأ بـ 'الموضوع:' ثم سطر فارغ ثم نص الرسالة. لا تخترع أرقام حسابات أو روابط دفع.",
      prompt: `اكتب رسالة تذكير بنبرة ${tone === "firm" ? "حازمة ومهذبة" : "ودية"} بناءً على البيانات التالية:\n${JSON.stringify(c, null, 2)}`,
    });
    const match = text.match(/^\s*الموضوع:\s*(.+)\n+([\s\S]+)$/);
    if (!match) return { ...templateReminder(c), body: text.trim(), aiGenerated: true };
    return { to: c.clientEmail, subject: match[1].trim(), body: match[2].trim(), aiGenerated: true };
  } catch (err) {
    console.error("AI reminder failed, using template", err);
    return templateReminder(c);
  }
}
