"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { InvoiceDTO, ClientDTO, ProductDTO } from "@/lib/types";
import type { InvoiceStatusValue } from "@/lib/invoice-status";
import { INVOICE_STATUSES, STATUS_LABELS } from "@/lib/invoice-status";
import { calcTotals } from "@/lib/calc";
import { toDateInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceTotals } from "./totals";
import { toast } from "sonner";

interface LineItem {
  productId: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  invoice?: InvoiceDTO;
  clients: ClientDTO[];
  products: ProductDTO[];
}

const emptyLine = (): LineItem => ({ productId: null, description: "", unit: "وحدة", quantity: 1, unitPrice: 0 });

export function InvoiceForm({ invoice, clients, products }: Props) {
  const router = useRouter();
  const isEdit = Boolean(invoice);

  const [clientId, setClientId] = useState(invoice?.client.id ?? "");
  const [status, setStatus] = useState<InvoiceStatusValue>(invoice?.status ?? "DRAFT");
  const [issueDate, setIssueDate] = useState(invoice ? toDateInput(invoice.issueDate) : toDateInput(new Date().toISOString()));
  const [dueDate, setDueDate] = useState(invoice ? toDateInput(invoice.dueDate) : toDateInput(new Date(Date.now() + 30 * 86400000).toISOString()));
  const [currency, setCurrency] = useState(invoice?.currency ?? "USD");
  const [taxRate, setTaxRate] = useState(invoice?.taxRate ?? 15);
  const [discount, setDiscount] = useState(invoice?.discount ?? 0);
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [items, setItems] = useState<LineItem[]>(
    invoice?.items.length
      ? invoice.items.map((i) => ({ productId: i.productId, description: i.description, unit: i.unit, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) }))
      : [emptyLine()],
  );
  const [saving, setSaving] = useState(false);

  const { subtotal, taxAmount, total } = calcTotals(items, taxRate, discount);

  const setItem = useCallback((idx: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }, []);

  function pickProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setItem(idx, { productId, description: p.name, unit: p.unit, unitPrice: Number(p.price) });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { toast.error("اختر العميل"); return; }
    if (!items.some((i) => i.description.trim())) { toast.error("أضف بنداً واحداً على الأقل"); return; }

    setSaving(true);
    try {
      const payload = {
        clientId, status, issueDate, dueDate, currency,
        taxRate, discount, notes: notes || null,
        items: items.filter((i) => i.description.trim()),
      };
      const res = await fetch(isEdit ? `/api/invoices/${invoice!.id}` : "/api/invoices", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "فشل الحفظ"); return; }
      toast.success(isEdit ? "تم تحديث الفاتورة" : "تم إنشاء الفاتورة");
      router.push(`/invoices/${data.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {/* Meta */}
      <Card>
        <CardHeader><CardTitle>{isEdit ? "تعديل الفاتورة" : "فاتورة جديدة"}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5 col-span-full sm:col-span-1">
            <Label>العميل *</Label>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">— اختر عميلاً —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatusValue)}>
              {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>العملة</Label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {["USD", "SAR", "AED", "EGP", "KWD", "LYD", "EUR"].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>تاريخ الإصدار</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>تاريخ الاستحقاق</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader><CardTitle>بنود الفاتورة</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start border rounded-lg p-3 bg-muted/30">
              <div className="col-span-12 sm:col-span-5 space-y-1">
                <Label className="text-xs">الوصف</Label>
                <div className="flex gap-1">
                  <Input
                    value={item.description}
                    onChange={(e) => setItem(idx, { description: e.target.value })}
                    placeholder="وصف البند..."
                  />
                  {products.length > 0 && (
                    <Select value={item.productId ?? ""} onChange={(e) => e.target.value && pickProduct(idx, e.target.value)} className="w-10 px-1">
                      <option value="">من الكتالوج</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  )}
                </div>
              </div>
              <div className="col-span-4 sm:col-span-2 space-y-1">
                <Label className="text-xs">الكمية</Label>
                <Input type="number" min="0.001" step="any" value={item.quantity}
                  onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })} />
              </div>
              <div className="col-span-4 sm:col-span-2 space-y-1">
                <Label className="text-xs">الوحدة</Label>
                <Input value={item.unit} onChange={(e) => setItem(idx, { unit: e.target.value })} />
              </div>
              <div className="col-span-4 sm:col-span-2 space-y-1">
                <Label className="text-xs">سعر الوحدة</Label>
                <Input type="number" min="0" step="any" value={item.unitPrice}
                  onChange={(e) => setItem(idx, { unitPrice: Number(e.target.value) })} />
              </div>
              <div className="col-span-10 sm:col-span-1 space-y-1">
                <Label className="text-xs">الإجمالي</Label>
                <p className="h-9 flex items-center text-sm font-medium tabular-nums">
                  {(item.quantity * item.unitPrice).toFixed(2)}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-end pb-0.5">
                <Button type="button" variant="ghost" size="icon" className="text-destructive"
                  onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                  disabled={items.length === 1}>✕</Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setItems((p) => [...p, emptyLine()])}>
            + إضافة بند
          </Button>
        </CardContent>
      </Card>

      {/* Totals + options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>الخيارات المالية</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>نسبة الضريبة (%)</Label>
              <Input type="number" min="0" max="100" step="any" value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>الخصم</Label>
              <Input type="number" min="0" step="any" value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات للعميل..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>ملخص المبالغ</CardTitle></CardHeader>
          <CardContent>
            <InvoiceTotals subtotal={subtotal} discount={discount} taxRate={taxRate} taxAmount={taxAmount} total={total} currency={currency} />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>إلغاء</Button>
        <Button type="submit" loading={saving}>{isEdit ? "حفظ التعديلات" : "إنشاء الفاتورة"}</Button>
      </div>
    </form>
  );
}
