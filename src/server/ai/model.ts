import { google } from "@ai-sdk/google";

// نموذج Gemini الافتراضي: أحدث إصدار Flash (سريع، يدعم العربية واستدعاء الأدوات).
// يمكن تغييره عبر المتغير GEMINI_MODEL، مثل "gemini-2.5-pro".
export const AI_MODEL_ID = process.env.GEMINI_MODEL || "gemini-flash-latest";

export function getModel() {
  return google(AI_MODEL_ID);
}

export function aiEnabled() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}
