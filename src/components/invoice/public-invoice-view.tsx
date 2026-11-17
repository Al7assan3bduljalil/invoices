"use client";
import { useState } from "react";
import type { InvoiceDTO } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { InvoiceTotals } from "./totals";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface Props {
  invoice: InvoiceDTO;
  stampUrl?: string | null;
  signatureUrl?: string | null;
}

export function PublicInvoiceView({ invoice: inv, stampUrl, signatureUrl }: Props) {
  const [copying, setCopying] = useState(false);

  async function copyLink() {
    setCopying(true);
    await navigator.clipboard.writeText(window.location.href);
    setTimeout(() => setCopying(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Top bar - hidden when printing */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div className="text-sm text-muted-foreground">
            {inv.client.name} · <span className="font-mono">{inv.number}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copying ? "✓ تم النسخ" : "🔗 نسخ الرابط"}
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              🖨️ طباعة / حفظ PDF
            </Button>
          </div>
        </div>

        {/* Invoice card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border print:shadow-none print:rounded-none print:border-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-l from-blue-600 to-blue-800 text-white p-8 print:bg-blue-700">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">فاتورة</h1>
                <p className="font-mono text-blue-200 mt-1 text-lg">{inv.number}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={inv.status} />
                <div className="mt-3 text-sm text-blue-100 space-y-1">
                  <div>تاريخ الإصدار: <span className="font-medium">{formatDate(inv.issueDate)}</span></div>
                  <div>تاريخ الاستحقاق: <span className="font-medium">{formatDate(inv.dueDate)}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Client info */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">إلى</p>
                <p className="font-semibold text-lg">{inv.client.name}</p>
                {inv.client.email && <p className="text-sm text-muted-foreground">{inv.client.email}</p>}
                {inv.client.phone && <p className="text-sm text-muted-foreground">{inv.client.phone}</p>}
                {inv.client.address && <p className="text-sm text-muted-foreground whitespace-pre-line">{inv.client.address}</p>}
                {inv.client.taxNumber && <p className="text-sm text-muted-foreground">رقم ضريبي: {inv.client.taxNumber}</p>}
              </div>
            </div>

            <Separator />

            {/* Line items */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوصف</TableHead>
                  <TableHead className="text-center">الكمية</TableHead>
                  <TableHead className="text-center">الوحدة</TableHead>
                  <TableHead className="text-end">سعر الوحدة</TableHead>
                  <TableHead className="text-end">المجموع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inv.items.map((item, i) => (
                  <TableRow key={item.id ?? i}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.unit}</TableCell>
                    <TableCell className="text-end">{formatMoney(item.unitPrice, inv.currency)}</TableCell>
                    <TableCell className="text-end font-medium">{formatMoney(item.lineTotal, inv.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator />

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72">
                <InvoiceTotals
                  subtotal={inv.subtotal}
                  discount={inv.discount}
                  taxRate={inv.taxRate}
                  taxAmount={inv.taxAmount}
                  total={inv.total}
                  currency={inv.currency}
                />
              </div>
            </div>

            {/* Notes */}
            {inv.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">ملاحظات</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{inv.notes}</p>
                </div>
              </>
            )}

            {/* Stamp & Signature */}
            {(stampUrl || signatureUrl) && (
              <>
                <Separator />
                <div className="flex justify-between items-end pt-2">
                  {signatureUrl ? (
                    <div className="text-center">
                      <img src={signatureUrl} alt="التوقيع" className="h-20 object-contain mx-auto" />
                      <p className="text-xs text-muted-foreground mt-1 border-t pt-1 w-32 mx-auto">التوقيع المعتمد</p>
                    </div>
                  ) : <div />}
                  {stampUrl ? (
                    <div className="text-center">
                      <img src={stampUrl} alt="الختم" className="h-24 w-24 object-contain mx-auto opacity-80" />
                      <p className="text-xs text-muted-foreground mt-1">ختم الشركة</p>
                    </div>
                  ) : <div />}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 text-center text-xs text-muted-foreground">
            شكراً لثقتكم · تم إنشاء هذه الفاتورة إلكترونياً
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
