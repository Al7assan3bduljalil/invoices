/**
 * بيانات الترويسة المعتمدة للشركة.
 * عدّل هذا الملف فقط لتغيير بيانات الترويسة في كل المستندات المطبوعة.
 */
export const BRAND = {
  name: "شموع المدينة",
  tagline: "للاتصالات وتقنية المعلومات",
  phone: "+218-920357271",
  address: "صبراتة - ليبيا",
  website: "www.cyberit.ly",
  colors: {
    green: "#01AB4D",
    dark: "#00531F",
    pale: "#E6F5EC",
    tint: "#F3FAF6",
  },
} as const;

export type DocumentKind = "invoice" | "quote";

export const DOCUMENT_LABELS: Record<DocumentKind, {
  title: string;
  number: string;
  date: string;
  due: string;
}> = {
  invoice: { title: "فاتورة", number: "رقم الفاتورة", date: "تاريخ الإصدار", due: "تاريخ الاستحقاق" },
  quote: { title: "عرض سعر", number: "رقم العرض", date: "تاريخ العرض", due: "صالح حتى" },
};

export function parseDocumentKind(value: unknown): DocumentKind {
  return value === "quote" ? "quote" : "invoice";
}
