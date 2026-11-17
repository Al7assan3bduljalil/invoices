export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as const;
export type InvoiceStatusValue = (typeof INVOICE_STATUSES)[number];

export const STATUS_LABELS: Record<InvoiceStatusValue, string> = {
  DRAFT: "مسودة",
  SENT: "مُرسلة",
  PAID: "مدفوعة",
  OVERDUE: "متأخرة",
  CANCELLED: "ملغاة",
};

export const STATUS_VARIANT: Record<InvoiceStatusValue, "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "outline",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

/** الحالات التي تنقل الفاتورة إلى الأرشيف تلقائياً */
export const AUTO_ARCHIVE_STATUSES: InvoiceStatusValue[] = ["PAID", "CANCELLED"];
