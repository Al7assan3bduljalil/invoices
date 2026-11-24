import { google } from "@ai-sdk/google";
import { APICallError, generateText, RetryError, type ToolSet } from "ai";
import { log } from "@/server/log";

// نموذج Gemini الافتراضي: أحدث إصدار Flash (سريع، يدعم العربية واستدعاء الأدوات).
// يمكن تغييره عبر المتغير GEMINI_MODEL، مثل "gemini-2.5-pro".
export const AI_MODEL_ID = process.env.GEMINI_MODEL || "gemini-flash-latest";

/** نموذج المهام البسيطة (تفريغ الصوت، قراءة الصور وPDF). الافتراضي = النموذج الرئيسي */
export const AI_MEDIA_MODEL_ID = process.env.GEMINI_MEDIA_MODEL || AI_MODEL_ID;

/** نماذج احتياطية تُجرّب بالترتيب عند انشغال النموذج الأساسي (GEMINI_FALLBACK_MODELS=a,b) */
const FALLBACK_MODEL_IDS = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-flash-lite-latest")
  .split(/[\s,]+/)
  .map((s) => s.trim())
  .filter(Boolean);

/** مهلة كل محاولة بالمللي ثانية */
const AGENT_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 90_000;
const MEDIA_TIMEOUT_MS = Number(process.env.GEMINI_MEDIA_TIMEOUT_MS) || 45_000;

export function getModel(id: string = AI_MODEL_ID) {
  return google(id);
}

export function aiEnabled() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

/** سلسلة النماذج: الأساسي ثم الاحتياطية بدون تكرار */
export function modelChain(primary: string = AI_MODEL_ID) {
  return [...new Set([primary, ...FALLBACK_MODEL_IDS])];
}

export type AiErrorKind = "busy" | "rate_limit" | "timeout" | "other";

/** تصنيف خطأ Gemini: هل يستحق التحويل لنموذج آخر؟ */
export function classifyAiError(err: unknown): AiErrorKind {
  const e = RetryError.isInstance(err) ? err.lastError : err;
  if (e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError")) return "timeout";
  if (APICallError.isInstance(e)) {
    if (e.statusCode === 429) return "rate_limit";
    if (e.statusCode && e.statusCode >= 500) return "busy";
    if (e.statusCode === 404) return "busy"; // نموذج غير متاح لهذا الحساب: جرّب التالي
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/overloaded|high demand|unavailable|try again later/i.test(msg)) return "busy";
  if (/aborted|timeout/i.test(msg)) return "timeout";
  return "other";
}

/** خطأ نهائي بعد فشل كل النماذج، يحمل نوع الخطأ لعرض رسالة مناسبة للمستخدم */
export class AiUnavailableError extends Error {
  constructor(
    public kind: AiErrorKind,
    public cause: unknown,
  ) {
    super(`Gemini unavailable (${kind})`);
    this.name = "AiUnavailableError";
  }
}

type GenerateArgs<TOOLS extends ToolSet> = Omit<
  Parameters<typeof generateText<TOOLS>>[0],
  "model" | "abortSignal" | "maxRetries"
>;

/**
 * generateText مع مهلة لكل محاولة وتحويل تلقائي للنموذج التالي عند الانشغال (503/429/مهلة).
 * لا يُعاد الطلب على نموذج آخر إذا نُفذت أداة تُغيّر البيانات (مثل إنشاء فاتورة) حتى لا تتكرر.
 */
export async function generateWithFallback<TOOLS extends ToolSet>(
  args: GenerateArgs<TOOLS>,
  opts: {
    task: string;
    primary?: string;
    timeoutMs?: number;
    /** أسماء الأدوات التي تكتب في قاعدة البيانات */
    mutatingTools?: ReadonlySet<string>;
  },
) {
  const chain = modelChain(opts.primary);
  const timeoutMs = opts.timeoutMs ?? (opts.task === "agent" ? AGENT_TIMEOUT_MS : MEDIA_TIMEOUT_MS);
  let lastErr: unknown;
  let lastKind: AiErrorKind = "other";

  for (let i = 0; i < chain.length; i++) {
    const modelId = chain[i];
    let mutated = false;
    try {
      const result = await generateText<TOOLS>({
        ...(args as Parameters<typeof generateText<TOOLS>>[0]),
        model: getModel(modelId),
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(timeoutMs),
        onStepFinish: async (step) => {
          if (opts.mutatingTools && step.toolCalls.some((c) => opts.mutatingTools!.has(c.toolName)))
            mutated = true;
          await args.onStepFinish?.(step);
        },
      });
      return { result, modelId, attempts: i + 1 };
    } catch (err) {
      lastErr = err;
      lastKind = classifyAiError(err);
      const canFallback = lastKind !== "other" && !mutated && i < chain.length - 1;
      log("warn", "ai.attempt_failed", {
        task: opts.task,
        model: modelId,
        kind: lastKind,
        mutated,
        fallback: canFallback ? chain[i + 1] : null,
        error: err,
      });
      if (!canFallback) break;
    }
  }
  throw new AiUnavailableError(lastKind, lastErr);
}
