/** حساب مجاميع الفاتورة. يُستخدم في الخادم والواجهة معاً لضمان التطابق. */
export type LineInput = { quantity: number; unitPrice: number };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calcTotals(items: LineInput[], taxRate: number, discount: number) {
  const lines = items.map((i) => round2(i.quantity * i.unitPrice));
  const subtotal = round2(lines.reduce((a, b) => a + b, 0));
  const safeDiscount = Math.min(Math.max(discount || 0, 0), subtotal);
  const taxable = subtotal - safeDiscount;
  const taxAmount = round2((taxable * (taxRate || 0)) / 100);
  const total = round2(taxable + taxAmount);
  return { lines, subtotal, discount: safeDiscount, taxAmount, total };
}
