import { formatMoney } from "@/lib/utils";

interface TotalsProps {
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
}

export function InvoiceTotals({ subtotal, discount, taxRate, taxAmount, total, currency }: TotalsProps) {
  const fmt = (n: number) => formatMoney(n, currency);
  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">المجموع الفرعي</span>
        <span>{fmt(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-green-600 dark:text-green-400">
          <span>الخصم</span>
          <span>- {fmt(discount)}</span>
        </div>
      )}
      {taxRate > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">الضريبة ({taxRate}%)</span>
          <span>{fmt(taxAmount)}</span>
        </div>
      )}
      <div className="flex justify-between font-semibold text-base pt-1 border-t">
        <span>الإجمالي</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  );
}
