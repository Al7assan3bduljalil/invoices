"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InvoiceDTO } from "@/lib/types";
import type { InvoiceStatusValue } from "@/lib/invoice-status";
import { INVOICE_STATUSES, STATUS_LABELS } from "@/lib/invoice-status";
import { formatMoney, formatDate, toDateInput } from "@/lib/utils";
import { StatusBadge } from "@/components/invoice/status-badge";
import { InvoiceTotals } from "@/components/invoice/totals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function InvoiceDetail({ invoice: inv }: { invoice: InvoiceDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(inv.status);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminder, setReminder] = useState<{ subject: string; body: string } | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);

  async function changeStatus(s: InvoiceStatusValue) {
    setStatus(s);
    const res = await fetch(`/api/invoices/${inv.id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    if (!res.ok) { toast.error("فشل تحديث الحالة"); return; }
    const updated = await res.json();
    toast.success(`الحالة: ${STATUS_LABELS[s]}${updated.archivedAt ? " — نُقلت إلى الأرشيف تلقائياً" : ""}`);
    startTransition(() => router.refresh());
  }

  const [editingDue, setEditingDue] = useState(false);
  const [dueInput, setDueInput] = useState(inv.dueDate ? toDateInput(inv.dueDate) : "");
  const [dueSaving, setDueSaving] = useState(false);

  /** حفظ تاريخ الاستحقاق الجديد، أو إلغاؤه عند تمرير null */
  async function saveDueDate(value: string | null) {
    setDueSaving(true);
    try {
      const res = await fetch(`/api/invoices/${inv.id}/due-date`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: value }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "فشل تعديل تاريخ الاستحقاق"); return; }
      setStatus(data.status);
      setDueInput(value ?? "");
      setEditingDue(false);
      toast.success(value ? "تم تعديل تاريخ الاستحقاق" : "تم إلغاء تاريخ الاستحقاق");
      startTransition(() => router.refresh());
    } finally {
      setDueSaving(false);
    }
  }

  async function archiveToggle() {
    const isArchived = Boolean(inv.archivedAt);
    const res = await fetch(`/api/invoices/${inv.id}/archive`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !isArchived }),
    });
    if (!res.ok) { toast.error("فشلت العملية"); return; }
    toast.success(isArchived ? "تم الاسترجاع من الأرشيف" : "تم نقل الفاتورة إلى الأرشيف");
    startTransition(() => router.refresh());
  }

  async function draftReminder() {
    setReminderLoading(true);
    try {
      const res = await fetch(`/api/invoices/${inv.id}/reminder`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      const data = await res.json();
      setReminder(data);
      setReminderOpen(true);
    } finally {
      setReminderLoading(false);
    }
  }

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/inv/${inv.shareToken}`;

  async function copyShare() {
    if (inv.status === "DRAFT") { toast.warning("المسودة لا يمكن مشاركتها"); return; }
    await navigator.clipboard.writeText(shareUrl);
    toast.success("تم نسخ رابط المشاركة");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold font-mono">{inv.number}</h1>
            <StatusBadge status={status} />
            {inv.archivedAt && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">مؤرشف</span>}
            {inv.createdByAI && <span className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full">أنشأه الذكاء الاصطناعي</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/print/invoice/${inv.id}?type=invoice`}>🖨️ طباعة فاتورة</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/print/invoice/${inv.id}?type=quote`}>📄 طباعة عرض سعر</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={copyShare}>🔗 مشاركة</Button>
          <Button variant="outline" size="sm" asChild>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">👁️ معاينة الزبون</a>
          </Button>
          <Button variant="outline" size="sm" onClick={draftReminder} loading={reminderLoading}
            disabled={!["SENT","OVERDUE"].includes(inv.status)}>
            ✉️ رسالة تذكير
          </Button>
          <Button variant="outline" size="sm" onClick={archiveToggle}>
            {inv.archivedAt ? "📤 استرجاع" : "🗄️ أرشفة"}
          </Button>
          <Button size="sm" asChild><Link href={`/invoices/${inv.id}/edit`}>تعديل</Link></Button>
        </div>
      </div>

      {/* Change status */}
      <Card>
        <CardContent className="pt-4 flex items-center gap-3">
          <span className="text-sm font-medium">تغيير الحالة:</span>
          <Select value={status} onChange={(e) => changeStatus(e.target.value as InvoiceStatusValue)} className="w-40">
            {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </Select>
        </CardContent>
      </Card>

      {/* Detail card */}
      <Card>
        <CardHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">العميل</p>
              <p className="font-semibold mt-0.5">{inv.client.name}</p>
              {inv.client.email && <p className="text-sm text-muted-foreground">{inv.client.email}</p>}
              {inv.client.phone && <p className="text-sm text-muted-foreground">{inv.client.phone}</p>}
            </div>
            <div className="text-end">
              <p className="text-xs text-muted-foreground">تاريخ الإصدار</p>
              <p className="font-medium mt-0.5">{formatDate(inv.issueDate)}</p>
              <p className="text-xs text-muted-foreground mt-2">تاريخ الاستحقاق</p>
              {editingDue ? (
                <div className="flex flex-wrap items-center justify-end gap-1 mt-1">
                  <Input type="date" value={dueInput} min={toDateInput(inv.issueDate)}
                    onChange={(e) => setDueInput(e.target.value)} className="w-40 h-8" />
                  <Button size="sm" onClick={() => saveDueDate(dueInput || null)} loading={dueSaving} disabled={!dueInput}>حفظ</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingDue(false); setDueInput(inv.dueDate ? toDateInput(inv.dueDate) : ""); }}>تراجع</Button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <p className="font-medium">{inv.dueDate ? formatDate(inv.dueDate) : <span className="text-muted-foreground">بدون</span>}</p>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingDue(true)}>
                    {inv.dueDate ? "✏️ تعديل" : "+ إضافة"}
                  </Button>
                  {inv.dueDate && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive"
                      onClick={() => saveDueDate(null)} disabled={dueSaving}>✕ إلغاء</Button>
                  )}
                </div>
              )}
              {inv.paidAt && <>
                <p className="text-xs text-muted-foreground mt-2">تاريخ الدفع</p>
                <p className="font-medium mt-0.5 text-green-600">{formatDate(inv.paidAt)}</p>
              </>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{item.unit}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatMoney(item.unitPrice, inv.currency)}</TableCell>
                  <TableCell className="text-end tabular-nums font-medium">{formatMoney(item.lineTotal, inv.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Separator />
          <div className="flex justify-end">
            <div className="w-72">
              <InvoiceTotals subtotal={inv.subtotal} discount={inv.discount} taxRate={inv.taxRate} taxAmount={inv.taxAmount} total={inv.total} currency={inv.currency} />
            </div>
          </div>
          {inv.notes && <>
            <Separator />
            <p className="text-sm text-muted-foreground whitespace-pre-line">{inv.notes}</p>
          </>}
        </CardContent>
      </Card>

      {/* Reminder modal */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>رسالة تذكير بالدفع</DialogTitle></DialogHeader>
          {reminder && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">الموضوع</p>
                <p className="font-medium">{reminder.subject}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">نص الرسالة</p>
                <pre className="text-sm whitespace-pre-wrap font-sans bg-muted rounded-lg p-4">{reminder.body}</pre>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(reminder.body); toast.success("تم نسخ الرسالة"); }}>
                  📋 نسخ النص
                </Button>
                {inv.client.email && (
                  <Button asChild>
                    <a href={`mailto:${inv.client.email}?subject=${encodeURIComponent(reminder.subject)}&body=${encodeURIComponent(reminder.body)}`}>
                      ✉️ فتح في البريد
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
