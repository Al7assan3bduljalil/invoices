/** عميل بسيط لواجهة Telegram Bot API (بدون مكتبات خارجية) */

export type TgUser = { id: number; first_name?: string; username?: string };
export type TgChat = { id: number; type: string };
export type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  caption?: string;
  voice?: TgVoice;
  audio?: TgVoice;
  photo?: TgPhotoSize[];
  document?: { file_id: string; mime_type?: string; file_size?: number; file_name?: string };
};
export type TgPhotoSize = { file_id: string; width: number; height: number; file_size?: number };
export type TgVoice = { file_id: string; duration?: number; mime_type?: string; file_size?: number };
export type TgUpdate = { update_id: number; message?: TgMessage; edited_message?: TgMessage };

export function telegramEnabled() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN غير مضبوط");
  const apiBase = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";
  const res = await fetch(`${apiBase}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!data.ok) throw new Error(`Telegram ${method} فشل: ${data.description ?? res.status}`);
  return data.result as T;
}

/** تنزيل ملف (مثل رسالة صوتية) من خوادم Telegram */
export async function downloadFile(fileId: string): Promise<Uint8Array> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN غير مضبوط");
  const info = await call<{ file_path?: string }>("getFile", { file_id: fileId });
  if (!info.file_path) throw new Error("Telegram لم يُرجع مسار الملف");
  const apiBase = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";
  const res = await fetch(`${apiBase}/file/bot${token}/${info.file_path}`);
  if (!res.ok) throw new Error(`تعذر تنزيل الملف من Telegram: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function sendChatAction(chatId: number, action: "typing" = "typing") {
  return call("sendChatAction", { chat_id: chatId, action }).catch(() => undefined);
}

/** حد Telegram للرسالة 4096 حرفاً؛ نقسم النص الطويل على الأسطر */
export function splitMessage(text: string, max = 3900): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    if ((cur + "\n" + line).length > max && cur) {
      parts.push(cur);
      cur = "";
    }
    cur = cur ? `${cur}\n${line}` : line;
    while (cur.length > max) {
      parts.push(cur.slice(0, max));
      cur = cur.slice(max);
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

const stripHtml = (h: string) =>
  h
    .replace(/<a href="([^"]+)">([^<]*)<\/a>/g, "$2: $1")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");

/** إرسال رسالة بتنسيق HTML، مع الرجوع لنص عادي إن رفض Telegram التنسيق */
export async function sendMessage(chatId: number, html: string, replyTo?: number) {
  const parts = splitMessage(html);
  for (let i = 0; i < parts.length; i++) {
    const base = {
      chat_id: chatId,
      link_preview_options: { is_disabled: true },
      ...(i === 0 && replyTo
        ? { reply_parameters: { message_id: replyTo, allow_sending_without_reply: true } }
        : {}),
    };
    try {
      await call("sendMessage", { ...base, text: parts[i], parse_mode: "HTML" });
    } catch (err) {
      console.warn("Telegram HTML rejected, sending plain text", err);
      await call("sendMessage", { ...base, text: stripHtml(parts[i]) });
    }
  }
}

export function setWebhook(url: string, secretToken: string) {
  return call("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
}

export function getWebhookInfo() {
  return call("getWebhookInfo", {});
}
