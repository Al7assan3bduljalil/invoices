import { getWebhookInfo, setWebhook, telegramEnabled } from "@/server/telegram/api";
import { appBaseUrl } from "@/server/telegram/bot";
import { requestOrigin, secretMatches } from "@/server/telegram/request";

export const dynamic = "force-dynamic";

/**
 * تسجيل webhook البوت لدى Telegram (مرة واحدة بعد ضبط المتغيرات):
 *   curl -X POST https://<الموقع>/api/telegram/setup -H "Authorization: Bearer $TELEGRAM_WEBHOOK_SECRET"
 * وطلب GET بنفس الترويسة يعرض حالة الـ webhook الحالية.
 */
function authorized(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  return secretMatches(auth.replace(/^Bearer\s+/i, ""));
}

export async function POST(req: Request) {
  if (!telegramEnabled()) return Response.json({ error: "TELEGRAM_BOT_TOKEN غير مضبوط" }, { status: 503 });
  if (!authorized(req)) return Response.json({ error: "غير مصرح" }, { status: 403 });
  const url = `${appBaseUrl(requestOrigin(req))}/api/telegram/webhook`;
  try {
    await setWebhook(url, process.env.TELEGRAM_WEBHOOK_SECRET!);
    return Response.json({ ok: true, webhook: url, info: await getWebhookInfo() });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function GET(req: Request) {
  if (!telegramEnabled()) return Response.json({ error: "TELEGRAM_BOT_TOKEN غير مضبوط" }, { status: 503 });
  if (!authorized(req)) return Response.json({ error: "غير مصرح" }, { status: 403 });
  try {
    return Response.json(await getWebhookInfo());
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
