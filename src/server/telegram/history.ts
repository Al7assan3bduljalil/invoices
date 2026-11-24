import type { ModelMessage } from "ai";

/** عدد أدوار المستخدم الأخيرة التي نحتفظ بها في ذاكرة المحادثة */
export const HISTORY_TURNS = Number(process.env.TELEGRAM_HISTORY_TURNS) || 8;
/** الحد الأقصى لطول نتيجة أداة من دور سابق (نتائج الدور الأخير تبقى كاملة) */
const OLD_TOOL_RESULT_CHARS = 600;
/** نص الملفات والصور الطويل في رسائل المستخدم السابقة يُختصر لهذا الطول */
const OLD_USER_TEXT_CHARS = 2000;

const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max)}…[مختصر]` : s);

/**
 * تخفيف سجل المحادثة قبل حفظه، لأنه يُرسل كاملاً إلى Gemini مع كل رسالة جديدة:
 * - نبقي آخر HISTORY_TURNS أدوار للمستخدم فقط، ونبدأ دائماً من رسالة مستخدم.
 * - نتائج الأدوات في الأدوار السابقة تُختصر (تبقى المعرّفات والأسماء الأولى، مثل رقم الفاتورة ومعرّف العميل).
 * - الدور الأخير يبقى كما هو حتى يفهم المساعد ردود المتابعة مثل «نعم أضفه».
 */
export function compactHistory(messages: ModelMessage[]): ModelMessage[] {
  const userIdx = messages.flatMap((m, i) => (m.role === "user" ? [i] : []));
  if (!userIdx.length) return [];
  const start = userIdx[Math.max(0, userIdx.length - HISTORY_TURNS)];
  const lastTurn = userIdx[userIdx.length - 1];

  return messages.slice(start).map((m, j) => {
    const i = start + j;
    if (i >= lastTurn) return m;
    if (m.role === "user" && typeof m.content === "string")
      return { ...m, content: cut(m.content, OLD_USER_TEXT_CHARS) };
    if (m.role !== "tool") return m;
    return {
      ...m,
      content: m.content.map((part) => {
        if (part.type !== "tool-result") return part;
        const o = part.output;
        const raw =
          o.type === "json" || o.type === "error-json"
            ? JSON.stringify(o.value)
            : o.type === "text" || o.type === "error-text"
              ? o.value
              : null;
        if (raw == null || raw.length <= OLD_TOOL_RESULT_CHARS) return part;
        return { ...part, output: { type: "text" as const, value: cut(raw, OLD_TOOL_RESULT_CHARS) } };
      }),
    };
  });
}
