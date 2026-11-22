import { generateText, stepCountIs, type ModelMessage } from "ai";
import { getCurrentUser } from "@/server/current-user";
import { aiEnabled, getModel } from "@/server/ai/model";
import { systemPrompt } from "@/server/ai/prompt";
import { buildTools } from "@/server/ai/tools";
import { downloadFile, sendChatAction, sendMessage, type TgMessage, type TgUpdate } from "./api";
import { detectKind, extractText, fileExtension, type FileKind } from "./files";
import { absolutize, markdownToTelegramHtml } from "./format";

/** معرّفات حسابات Telegram المسموح لها باستخدام البوت (TELEGRAM_ALLOWED_USER_IDS=123,456) */
export function allowedUserIds(): Set<number> {
  return new Set(
    (process.env.TELEGRAM_ALLOWED_USER_IDS ?? "")
      .split(/[\s,]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isSafeInteger(n) && n > 0),
  );
}

export function appBaseUrl(fallback?: string) {
  return (process.env.APP_URL || fallback || "").replace(/\/+$/, "");
}

// ---------- ذاكرة المحادثة (في الذاكرة؛ تُمسح عند إعادة التشغيل أو بالأمر /new) ----------
const HISTORY_LIMIT = 40;
const HISTORY_TTL_MS = 3 * 60 * 60 * 1000;
type Session = { messages: ModelMessage[]; updatedAt: number };
const g = globalThis as unknown as {
  __tgSessions?: Map<number, Session>;
  __tgQueues?: Map<number, Promise<void>>;
  __tgSeen?: Set<number>;
};
const sessions = (g.__tgSessions ??= new Map());
const queues = (g.__tgQueues ??= new Map());
const seen = (g.__tgSeen ??= new Set());

function getHistory(chatId: number): ModelMessage[] {
  const s = sessions.get(chatId);
  if (!s || Date.now() - s.updatedAt > HISTORY_TTL_MS) return [];
  return s.messages;
}

function saveHistory(chatId: number, messages: ModelMessage[]) {
  let trimmed = messages.slice(-HISTORY_LIMIT);
  // لا نبدأ السجل برسالة أداة أو رد مساعد يتيم: نبدأ من أول رسالة للمستخدم
  const firstUser = trimmed.findIndex((m) => m.role === "user");
  trimmed = firstUser > 0 ? trimmed.slice(firstUser) : trimmed;
  sessions.set(chatId, { messages: trimmed, updatedAt: Date.now() });
}

function telegramPrompt(base: string, appUrl: string) {
  return `${base}

قواعد إضافية لأنك تعمل الآن عبر بوت Telegram:
- المستخدم يكتب من هاتفه وغالباً بلغة عامية ومختصرة؛ افهم قصده واطلب التوضيح فقط عند الغموض الحقيقي.
- عند طلب "عرض سعر" أو "تجهيز عرض" لجهة: حدد العميل، ثم تعرّف على كل صنف بالبحث في الكتالوج. إذا كان العميل وكل الأصناف والكميات واضحة فأنشئ العرض كمسودة مباشرة، وإلا فاعرض ما فهمته في قائمة قصيرة (الصنف، الكمية، السعر) واسأل عن الناقص فقط.
- لا تستخدم جداول markdown؛ اعرض البنود كقائمة: • الصنف — الكمية × السعر = المجموع.
- بعد إنشاء عرض أو فاتورة اذكر رابطها${appUrl ? ` على ${appUrl}` : ""} ورابط المشاركة العام (publicUrl) إن توفر، كروابط markdown.
- اجعل الردود قصيرة ومناسبة لشاشة الهاتف.`;
}

const MAX_VOICE_BYTES = 10 * 1024 * 1024;
const MAX_VOICE_SECONDS = 180;

/** تحويل رسالة صوتية إلى نص عربي باستخدام Gemini (يفهم الصوت مباشرة) */
async function transcribeVoice(msg: TgMessage): Promise<string> {
  const v = msg.voice ?? msg.audio!;
  const bytes = await downloadFile(v.file_id);
  const { text } = await generateText({
    model: getModel(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "فرّغ هذه الرسالة الصوتية حرفياً إلى نص. المتحدث يطلب من مساعد فوترة (عروض أسعار، أصناف، عملاء، فواتير)، " +
              "وغالباً بالعربية بلهجة عامية وقد يذكر أسماء أصناف وأرقاماً وأسعاراً. اكتب الأرقام بالأرقام (10 وليس عشرة) " +
              "وأبقِ أسماء الأصناف والعلامات التجارية كما نُطقت. أعد النص فقط بدون أي شرح. " +
              "إذا لم تسمع كلاماً واضحاً فأعد كلمة: [غير واضح]",
          },
          { type: "file", data: bytes, mediaType: v.mime_type || "audio/ogg" },
        ],
      },
    ],
  });
  return text.trim();
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const escHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** أكبر نسخة من الصورة المرسلة (صورة عادية أو ملف صورة) */
function pickImage(msg: TgMessage): { fileId: string; mime: string; size: number } | null {
  if (msg.photo?.length) {
    const p = msg.photo[msg.photo.length - 1];
    return { fileId: p.file_id, mime: "image/jpeg", size: p.file_size ?? 0 };
  }
  const d = msg.document;
  if (d?.mime_type?.startsWith("image/"))
    return { fileId: d.file_id, mime: d.mime_type, size: d.file_size ?? 0 };
  return null;
}

/** قراءة الصورة (OCR + فهم) بواسطة Gemini وإرجاع النص الظاهر فيها منظماً */
async function readImage(img: { fileId: string; mime: string }): Promise<string> {
  const bytes = await downloadFile(img.fileId);
  const { text } = await generateText({
    model: getModel(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "استخرج كل النص الظاهر في هذه الصورة حرفياً وبترتيبه، بالعربية أو الإنجليزية. " +
              "إن كانت فاتورة أو عرض سعر أو قائمة أصناف فاكتب كل بند في سطر مستقل بالشكل: الصنف | الكمية | الوحدة | السعر (ما يظهر فقط) " +
              "واذكر اسم الجهة/العميل والتاريخ والإجمالي إن ظهرت. اكتب الأرقام كما تظهر ولا تخمّن أرقاماً غير واضحة (اكتب [غير واضح]). " +
              "إن لم يكن في الصورة نص فصف محتواها بجملة قصيرة. أعد النتيجة فقط بدون شرح.",
          },
          { type: "file", data: bytes, mediaType: img.mime },
        ],
      },
    ],
  });
  return text.trim();
}

// ---------- الملفات (Excel، Word، CSV، TXT، PDF...) ----------
const MAX_FILE_BYTES = 15 * 1024 * 1024; // حد تنزيل البوت من Telegram 20MB
const MAX_FILE_TEXT_CHARS = 60_000; // ما يُمرَّر للمساعد من نص الملف
const SUPPORTED_FILES = "Excel (xlsx)، Word (docx)، PowerPoint (pptx)، PDF، CSV، TXT، JSON";

/** قراءة ملف PDF بواسطة Gemini (يفهم PDF مباشرة بما فيه الممسوح ضوئياً) */
async function readPdf(bytes: Uint8Array): Promise<string> {
  const { text } = await generateText({
    model: getModel(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "استخرج كل النص في ملف PDF هذا حرفياً وبترتيبه، بالعربية أو الإنجليزية. " +
              "اكتب الجداول وقوائم الأصناف بحيث يكون كل صف في سطر مستقل والأعمدة مفصولة بـ | (مثل: الصنف | الكمية | الوحدة | السعر). " +
              "اكتب الأرقام كما تظهر ولا تخمّن أرقاماً غير واضحة (اكتب [غير واضح]). أعد النتيجة فقط بدون شرح.",
          },
          { type: "file", data: bytes, mediaType: "application/pdf" },
        ],
      },
    ],
  });
  return text.trim();
}

function kindLabel(kind: FileKind) {
  return (
    { xlsx: "Excel", docx: "Word", pptx: "PowerPoint", pdf: "PDF", csv: "CSV", json: "JSON", text: "نصي" } as Record<
      string,
      string
    >
  )[kind];
}

/** استقبال ملف: استخراج محتواه وعرض معاينة ثم تمريره للمساعد مع تعليق المستخدم */
async function handleDocument(msg: TgMessage, caption: string, baseUrl: string) {
  const doc = msg.document!;
  const name = doc.file_name || "ملف";
  const kind = detectKind(doc.file_name, doc.mime_type);
  const chatId = msg.chat.id;

  if (kind === "legacy-office") {
    const ext = fileExtension(doc.file_name);
    const modern = ext === "doc" ? "docx" : ext === "ppt" ? "pptx" : "xlsx";
    await sendMessage(
      chatId,
      `صيغة <b>.${escHtml(ext || "قديمة")}</b> قديمة ولا أستطيع قراءتها. احفظ الملف بصيغة <b>.${modern}</b> أو PDF وأرسله مرة أخرى.`,
      msg.message_id,
    );
    return;
  }
  if (kind === "unsupported") {
    await sendMessage(
      chatId,
      `لا أستطيع قراءة هذا النوع من الملفات (${escHtml(name)}).\nالصيغ المدعومة: ${SUPPORTED_FILES}، والصور.`,
      msg.message_id,
    );
    return;
  }
  if ((doc.file_size ?? 0) > MAX_FILE_BYTES) {
    await sendMessage(chatId, "الملف كبير جداً. أرسل ملفاً أصغر من 15 ميغابايت من فضلك.", msg.message_id);
    return;
  }
  if (kind === "pdf" && !aiEnabled()) {
    await sendMessage(chatId, "قراءة ملفات PDF تحتاج تفعيل المساعد الذكي على الخادم.", msg.message_id);
    return;
  }

  await sendChatAction(chatId);
  let extracted = "";
  try {
    const bytes = await downloadFile(doc.file_id);
    extracted = kind === "pdf" ? await readPdf(bytes) : extractText(kind, bytes);
  } catch (err) {
    console.error(`Telegram file reading failed (${kind}, ${name})`, err);
    await sendMessage(chatId, `تعذر قراءة الملف «${escHtml(name)}». تأكد أنه غير تالف وغير محمي بكلمة مرور.`, msg.message_id);
    return;
  }
  extracted = extracted.replace(/\u0000/g, "").trim();
  if (!extracted) {
    await sendMessage(chatId, `الملف «${escHtml(name)}» فارغ أو لا يحتوي نصاً يمكن قراءته.`, msg.message_id);
    return;
  }

  let truncatedNote = "";
  if (extracted.length > MAX_FILE_TEXT_CHARS) {
    extracted = extracted.slice(0, MAX_FILE_TEXT_CHARS);
    truncatedNote = "\n\n[تنبيه: الملف طويل، وهذا أول جزء منه فقط]";
  }
  const lines = extracted.split("\n").length;
  const preview = extracted.length > 1200 ? `${extracted.slice(0, 1200)}…` : extracted;
  await sendMessage(
    chatId,
    `📄 قرأتُ ملف ${kindLabel(kind)} «${escHtml(name)}» (${lines} سطر):\n<pre>${escHtml(preview)}</pre>` +
      (truncatedNote ? "\n⚠️ الملف طويل، سأعتمد على أول جزء منه فقط." : ""),
    msg.message_id,
  );

  const header = `[محتوى ملف ${kindLabel(kind)} أرسلته: ${name}]`;
  const instruction = caption
    ? `${caption}\n\n${header}\n${extracted}${truncatedNote}`
    : `${header} (بدون تعليق)\n${extracted}${truncatedNote}\n\n` +
      "حلّل محتوى الملف: إن كان طلب عرض سعر أو قائمة أصناف أو قائمة أسعار أو أصناف جديدة فلخّص ما فهمته باختصار " +
      "واسألني ماذا أريد (مثلاً: تجهيز عرض لجهة معينة، أو إضافة/تحديث الأصناف في الكتالوج) واسأل عن العميل أو الناقص فقط، " +
      "وإلا فلخّصه باختصار واسألني ماذا أفعل به. لا تضف أصنافاً أو أسعاراً غير موجودة في الملف.";
  await runAgent(msg, instruction, baseUrl);
}

const HELP = `أهلاً 👋 أنا مساعد الفوترة.
اكتب لي طلبك بالعربي، مثلاً:
• جهّز عرض سعر لشركة النور: 10 كابل شبكة و 2 راوتر
• أضف صنف جديد: كاميرا مراقبة خارجية 4MP بسعر 85 دينار للقطعة
• كم مبيعات هذا الشهر؟

🎙 يمكنك أيضاً إرسال رسالة صوتية وسأفهمها وأنفذها كأنك كتبتها.
📷 أو أرسل صورة (قائمة أصناف، فاتورة، عرض سعر) وسأقرأها، ويمكنك كتابة تعليق يوضح ما تريده منها.
📄 أو أرسل ملفاً: Excel أو Word أو PDF أو CSV أو TXT (مثل قائمة أسعار أو طلب أصناف من جهة)، واكتب في التعليق ما تريده، مثلاً: «جهّز منه عرض سعر لشركة النور».

الأوامر:
/new بدء محادثة جديدة (مسح السياق)
/id عرض معرّف حسابك`;

async function reply(msg: TgMessage, markdown: string, baseUrl: string) {
  const md = baseUrl ? absolutize(markdown, baseUrl) : markdown;
  await sendMessage(msg.chat.id, markdownToTelegramHtml(md), msg.message_id);
}

async function runAgent(msg: TgMessage, text: string, baseUrl: string) {
  const chatId = msg.chat.id;
  if (!aiEnabled()) {
    await reply(msg, "المساعد الذكي غير مفعّل على الخادم (مفتاح Gemini غير مضبوط).", baseUrl);
    return;
  }
  const user = await getCurrentUser();
  const history = getHistory(chatId);
  const input: ModelMessage[] = [...history, { role: "user", content: text }];

  await sendChatAction(chatId);
  const typing = setInterval(() => void sendChatAction(chatId), 4500);
  try {
    const result = await generateText({
      model: getModel(),
      system: telegramPrompt(
        systemPrompt({
          userName: user.name,
          companyName: user.companyName,
          currency: user.currency,
          taxRate: Number(user.defaultTaxRate),
        }),
        baseUrl,
      ),
      messages: input,
      tools: buildTools(user.id),
      stopWhen: stepCountIs(12),
    });
    saveHistory(chatId, [...input, ...result.response.messages]);
    const answer = result.text.trim() || "تم ✅";
    await reply(msg, answer, baseUrl);
  } catch (err) {
    console.error("Telegram agent failed", err);
    await reply(msg, "تعذر تنفيذ الطلب الآن، حاول مرة أخرى بعد قليل.", baseUrl);
  } finally {
    clearInterval(typing);
  }
}

async function processUpdate(update: TgUpdate, baseUrl: string) {
  const msg = update.message;
  if (!msg?.from) return;
  const text = (msg.text ?? msg.caption ?? "").trim();
  const allowed = allowedUserIds();

  if (/^\/id\b/.test(text)) {
    await sendMessage(msg.chat.id, `معرّف حسابك في Telegram: <code>${msg.from.id}</code>`, msg.message_id);
    return;
  }
  if (!allowed.has(msg.from.id)) {
    console.warn(`Telegram: رسالة مرفوضة من حساب غير مصرح ${msg.from.id} (@${msg.from.username ?? "-"})`);
    await sendMessage(
      msg.chat.id,
      `هذا البوت خاص. معرّف حسابك: <code>${msg.from.id}</code>`,
      msg.message_id,
    );
    return;
  }
  const image = pickImage(msg);
  if (image) {
    if (image.size > MAX_IMAGE_BYTES) {
      await sendMessage(msg.chat.id, "الصورة كبيرة جداً. أرسل صورة أصغر من 10 ميغابايت من فضلك.", msg.message_id);
      return;
    }
    await sendChatAction(msg.chat.id);
    let extracted = "";
    try {
      extracted = aiEnabled() ? await readImage(image) : "";
    } catch (err) {
      console.error("Telegram image reading failed", err);
    }
    if (!extracted) {
      await sendMessage(msg.chat.id, "لم أستطع قراءة الصورة، أعد إرسالها بشكل أوضح أو اكتب طلبك.", msg.message_id);
      return;
    }
    // نعرض ما قُرئ ليتأكد المستخدم، ثم ننفذه بنفس الصلاحيات والتأكيدات
    const shown = extracted.length > 1500 ? `${extracted.slice(0, 1500)}…` : extracted;
    await sendMessage(msg.chat.id, `📷 قرأتُ في الصورة:\n<pre>${escHtml(shown)}</pre>`, msg.message_id);
    const instruction = text
      ? `${text}\n\n[نص مستخرج من صورة أرسلتها]\n${extracted}`
      : `[نص مستخرج من صورة أرسلتها بدون تعليق]\n${extracted}\n\n` +
        "حلّل محتوى الصورة: إن كان طلب عرض سعر أو قائمة أصناف أو أصناف جديدة فنفّذه وفق القواعد (واسأل عن العميل أو الناقص فقط)، " +
        "وإلا فلخّصه باختصار واسألني ماذا أفعل به. لا تضف أصنافاً أو أسعاراً غير ظاهرة في الصورة.";
    await runAgent(msg, instruction, baseUrl);
    return;
  }
  if (msg.document) {
    await handleDocument(msg, text, baseUrl);
    return;
  }
  const voice = msg.voice ?? msg.audio;
  if (!text && voice) {
    if ((voice.duration ?? 0) > MAX_VOICE_SECONDS || (voice.file_size ?? 0) > MAX_VOICE_BYTES) {
      await sendMessage(msg.chat.id, "الرسالة الصوتية طويلة. أرسل رسالة أقصر من 3 دقائق من فضلك.", msg.message_id);
      return;
    }
    await sendChatAction(msg.chat.id);
    let heard = "";
    try {
      heard = aiEnabled() ? await transcribeVoice(msg) : "";
    } catch (err) {
      console.error("Telegram voice transcription failed", err);
    }
    if (!heard || heard === "[غير واضح]") {
      await sendMessage(msg.chat.id, "لم أستطع فهم الرسالة الصوتية، أعد إرسالها بصوت أوضح أو اكتب طلبك.", msg.message_id);
      return;
    }
    // نعرض ما فُهم ليتأكد المستخدم، ثم ننفذه كأنه نص مكتوب (نفس الصلاحيات والتأكيدات)
    await sendMessage(msg.chat.id, `🎙 سمعتك تقول:\n<i>${escHtml(heard)}</i>`, msg.message_id);
    await runAgent(msg, heard, baseUrl);
    return;
  }
  if (!text) {
    await sendMessage(msg.chat.id, "أرسل طلبك كنص أو رسالة صوتية أو صورة أو ملف (Excel، Word، PDF، CSV، TXT) من فضلك.", msg.message_id);
    return;
  }
  if (/^\/(start|help)\b/.test(text)) {
    await reply(msg, HELP, baseUrl);
    return;
  }
  if (/^\/(new|reset)\b/.test(text)) {
    sessions.delete(msg.chat.id);
    await reply(msg, "بدأنا محادثة جديدة ✅", baseUrl);
    return;
  }
  await runAgent(msg, text, baseUrl);
}

/**
 * معالجة تحديث واحد من Telegram. التحديثات لنفس المحادثة تُعالج بالتسلسل
 * حتى لا تتداخل ذاكرة المحادثة، والتحديث المكرر (إعادة إرسال من Telegram) يُتجاهل.
 */
export function handleUpdate(update: TgUpdate, baseUrl: string): Promise<void> {
  if (seen.has(update.update_id)) return Promise.resolve();
  seen.add(update.update_id);
  if (seen.size > 1000) seen.delete(seen.values().next().value as number);

  const chatId = update.message?.chat.id;
  if (chatId == null) return Promise.resolve();
  const prev = queues.get(chatId) ?? Promise.resolve();
  const next = prev
    .then(() => processUpdate(update, baseUrl))
    .catch((err: unknown) => console.error("Telegram update failed", err))
    .finally(() => {
      if (queues.get(chatId) === next) queues.delete(chatId);
    });
  queues.set(chatId, next);
  return next;
}
