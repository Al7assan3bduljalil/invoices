import { z } from "zod";
import { INVOICE_STATUSES } from "@/lib/invoice-status";

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const clientSchema = z.object({
  name: z.string().trim().min(1, "اسم العميل مطلوب"),
  email: optionalText.refine((v) => !v || z.email().safeParse(v).success, "بريد غير صالح"),
  phone: optionalText,
  address: optionalText,
  taxNumber: optionalText,
  notes: optionalText,
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "اسم المنتج مطلوب"),
  description: optionalText,
  unit: z.string().trim().min(1).default("وحدة"),
  price: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const invoiceItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().trim().min(1, "وصف البند مطلوب"),
  unit: z.string().trim().default("وحدة"),
  quantity: z.coerce.number().positive("الكمية يجب أن تكون أكبر من صفر"),
  unitPrice: z.coerce.number().min(0),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "اختر العميل"),
  status: z.enum(INVOICE_STATUSES).default("DRAFT"),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  currency: z.string().trim().length(3).default("USD"),
  exchangeRate: z.coerce.number().positive().optional().nullable(),
  exchangeCurrency: z.string().trim().length(3).optional(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discount: z.coerce.number().min(0).default(0),
  notes: optionalText,
  items: z.array(invoiceItemSchema).min(1, "أضف بنداً واحداً على الأقل"),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

/** إعدادات سعر الصرف في الطباعة — كل الحقول اختيارية */
export const exchangeRateSchema = z.object({
  exchangeRate: z.coerce.number().positive("سعر الصرف يجب أن يكون أكبر من صفر").nullable().optional(),
  exchangeCurrency: z.string().trim().length(3).optional(),
  showExchangeRate: z.boolean().optional(),
});
