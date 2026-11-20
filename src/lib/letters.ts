/** ثوابت قسم المراسلات (آمنة للاستخدام في الواجهة والخادم) */

export const LETTER_DIRECTIONS = ["OUTGOING", "INCOMING"] as const;
export type LetterDirectionValue = (typeof LETTER_DIRECTIONS)[number];

export const LETTER_STATUSES = ["DRAFT", "SENT", "CLOSED"] as const;
export type LetterStatusValue = (typeof LETTER_STATUSES)[number];

export const DIRECTION_LABELS: Record<LetterDirectionValue, string> = {
  OUTGOING: "صادر",
  INCOMING: "وارد",
};

/** حرف بادئة الرقم الإشاري */
export const DIRECTION_PREFIX: Record<LetterDirectionValue, string> = {
  OUTGOING: "ص",
  INCOMING: "و",
};

export function statusLabel(status: LetterStatusValue, direction: LetterDirectionValue) {
  if (status === "DRAFT") return "مسودة";
  if (status === "CLOSED") return "مُغلق";
  return direction === "INCOMING" ? "مُستلم" : "مُرسل";
}

export const STATUS_VARIANT: Record<LetterStatusValue, "secondary" | "success" | "outline"> = {
  DRAFT: "secondary",
  SENT: "success",
  CLOSED: "outline",
};

export type LetterDTO = {
  id: string;
  number: string;
  direction: LetterDirectionValue;
  status: LetterStatusValue;
  date: string;
  subject: string;
  party: string;
  partyTitle: string | null;
  externalRef: string | null;
  body: string;
  signatory: string | null;
  cc: string | null;
  notes: string | null;
  clientId: string | null;
  client: { id: string; name: string } | null;
  createdByAI: boolean;
  createdAt: string;
  updatedAt: string;
};
