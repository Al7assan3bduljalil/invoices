import { z } from "zod";
import { BRAND } from "@/components/letterhead/brand";

/**
 * إعدادات الطباعة القابلة للتعديل من صفحة الإعدادات:
 * الترويسة، الختم والتوقيع، ونصوص القوالب الجاهزة.
 * تُحفظ في عمود User.printSettings (JSON) وتُدمج دائماً مع القيم الافتراضية،
 * فأي حقل غير محفوظ يأخذ القيمة الافتراضية.
 */

const imageDataUrl = z
  .string()
  .regex(/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/, "يجب أن تكون صورة")
  .max(3_000_000, "الصورة كبيرة جداً")
  .nullable();

const text = (max = 500) => z.string().max(max);

export const signPositions = ["start", "center", "end"] as const;
export type SignPosition = (typeof signPositions)[number];

export const printSettingsSchema = z.object({
  letterhead: z.object({
    /** إظهار الترويسة المطبوعة (أطفئها عند الطباعة على ورق مطبوع مسبقاً) */
    enabled: z.boolean(),
    showWatermark: z.boolean(),
    name: text(80),
    tagline: text(120),
    phone: text(60),
    address: text(120),
    website: text(80),
    /** شعار مرفوع يحل محل الشعار المرسوم والاسم */
    logoUrl: imageDataUrl,
  }),
  sign: z.object({
    showSignature: z.boolean(),
    showStamp: z.boolean(),
    /** المستندات التي يظهر فيها الختم والتوقيع */
    onInvoice: z.boolean(),
    onQuote: z.boolean(),
    onLetter: z.boolean(),
    /** ارتفاع التوقيع بالمليمتر */
    signatureSize: z.number().min(10).max(45),
    /** قطر الختم بالمليمتر */
    stampSize: z.number().min(15).max(55),
    /** غير مستخدم: الختم والتوقيع دائماً في خانة واحدة (يبقى للتوافق مع القيم المحفوظة) */
    overlap: z.boolean(),
    /** موضع كتلة التوقيع في الصفحة */
    position: z.enum(signPositions),
    /** إمالة الختم بالدرجات */
    stampRotation: z.number().min(-30).max(30),
    /** عنوان خانة التوقيع والختم */
    signatureLabel: text(60),
    /** غير مستخدم (كان عنوان خانة الختم المنفصلة) */
    stampLabel: text(60),
    signatoryName: text(80),
  }),
  templates: z.object({
    invoiceTitle: text(40),
    quoteTitle: text(40),
    quoteIntro: text(),
    /** {date} يُستبدل بتاريخ انتهاء العرض */
    quoteValidity: text(),
    invoiceTerms: text(1000),
    quoteTerms: text(1000),
    letterGreeting: text(120),
    letterClosing: text(200),
    defaultSignatory: text(80),
  }),
});

export type PrintSettings = z.infer<typeof printSettingsSchema>;

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  letterhead: {
    enabled: true,
    showWatermark: true,
    name: BRAND.name,
    tagline: BRAND.tagline,
    phone: BRAND.phone,
    address: BRAND.address,
    website: BRAND.website,
    logoUrl: null,
  },
  sign: {
    showSignature: true,
    showStamp: true,
    onInvoice: true,
    onQuote: true,
    onLetter: true,
    signatureSize: 20,
    stampSize: 32,
    overlap: false,
    position: "end",
    stampRotation: 0,
    signatureLabel: "التوقيع المعتمد وختم الشركة",
    stampLabel: "ختم الشركة",
    signatoryName: "",
  },
  templates: {
    invoiceTitle: "فاتورة",
    quoteTitle: "عرض سعر",
    quoteIntro: "تحية طيبة وبعد، يسرّنا أن نتقدم لكم بعرض السعر التالي:",
    quoteValidity: "هذا العرض ساري حتى {date}.",
    invoiceTerms: "",
    quoteTerms: "",
    letterGreeting: "تحية طيبة وبعد،",
    letterClosing: "وتفضلوا بقبول فائق الاحترام والتقدير،،،",
    defaultSignatory: "المدير العام",
  },
};

/** يدمج القيم المحفوظة مع الافتراضية ويتجاهل أي قيمة غير صالحة */
export function resolvePrintSettings(raw: unknown): PrintSettings {
  const saved = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = structuredClone(DEFAULT_PRINT_SETTINGS) as Record<string, Record<string, unknown>>;
  for (const section of Object.keys(out) as (keyof PrintSettings)[]) {
    const shape = printSettingsSchema.shape[section].shape as Record<string, z.ZodType>;
    const values = saved[section];
    if (!values || typeof values !== "object") continue;
    for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
      if (key in shape && shape[key].safeParse(value).success) out[section][key] = value;
    }
  }
  return out as PrintSettings;
}

/** الصور والإعدادات اللازمة لرسم الختم والتوقيع في مستند معين */
export interface SignAssets {
  signatureUrl: string | null;
  stampUrl: string | null;
}

export type SignDocument = "invoice" | "quote" | "letter";

export function signFor(doc: SignDocument, s: PrintSettings, assets: SignAssets): SignAssets {
  const on = doc === "invoice" ? s.sign.onInvoice : doc === "quote" ? s.sign.onQuote : s.sign.onLetter;
  // الختم والتوقيع خانة واحدة: يظهران معاً أو يختفيان معاً
  const show = on && s.sign.showSignature && s.sign.showStamp;
  return {
    signatureUrl: show ? assets.signatureUrl : null,
    stampUrl: show ? assets.stampUrl : null,
  };
}

/** بيانات الطباعة الكاملة للمستخدم */
export function printContext(user: { printSettings?: unknown; stampUrl: string | null; signatureUrl: string | null }) {
  return {
    settings: resolvePrintSettings(user.printSettings),
    assets: { stampUrl: user.stampUrl, signatureUrl: user.signatureUrl } as SignAssets,
  };
}
