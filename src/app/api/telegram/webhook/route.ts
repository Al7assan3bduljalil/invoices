import { after } from "next/server";
import { telegramEnabled, type TgUpdate } from "@/server/telegram/api";
import { appBaseUrl, handleUpdate } from "@/server/telegram/bot";
import { requestOrigin, secretMatches } from "@/server/telegram/request";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Webhook يستقبل رسائل بوت Telegram.
 * Telegram يرسل السر في الترويسة X-Telegram-Bot-Api-Secret-Token (يُضبط عند تسجيل الـ webhook).
 * نرد فوراً بـ 200 ونعالج الرسالة بعد الرد حتى لا يعيد Telegram الإرسال أثناء عمل المساعد.
 */
export async function POST(req: Request) {
  if (!telegramEnabled()) return new Response("telegram disabled", { status: 404 });
  if (!secretMatches(req.headers.get("x-telegram-bot-api-secret-token")))
    return new Response("forbidden", { status: 403 });

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const baseUrl = appBaseUrl(requestOrigin(req));
  after(() => handleUpdate(update, baseUrl));
  return Response.json({ ok: true });
}
