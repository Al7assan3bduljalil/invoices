"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InvoiceDTO } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/invoice-status";
import { StatusBadge } from "@/components/invoice/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export function InvoicesTable({ invoices: initial }: { invoices: InvoiceDTO[] }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const filtered = initial.filter((i) =>
    !q ||
    i.number.toLowerCase().includes(q.toLowerCase()) ||
    i.client.name.toLowerCase().includes(q.toLowerCase()),
  );

  async function archive(id: string) {
    const res = await fetch(`/api/invoices/${id}/archive`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (!res.ok) { toast.error("فشل الأرشفة"); return; }
    toast.success("تم نقل الفاتورة إلى الأرشيف");
    startTransition(() => router.refresh());
  }

  async function del(id: string, number: string) {
    if (!confirm(`هل تريد حذف الفاتورة ${number}؟`)) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error((await res.json()).error ?? "فشل الحذف"); return; }
    toast.success("تم حذف الفاتورة");
    startTransition(() => router.refresh());
  }

  const shareUrl = (number: string) => `${window.location.origin}/${encodeURIComponent(number)}`;

  async function copyShare(number: string, status: string) {
    if (status === "DRAFT") { toast.warning("المسودة لا يمكن مشاركتها — غيّر الحالة إلى مُرسلة أولاً"); return; }
    await navigator.clipboard.writeText(shareUrl(number));
    toast.success("تم نسخ رابط المشاركة");
  }

  return (
    <div className="space-y-4">
      <Input placeholder="🔍 بحث برقم الفاتورة أو اسم العميل..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>تاريخ الإصدار</TableHead>
              <TableHead>الاستحقاق</TableHead>
              <TableHead className="text-end">المبلغ</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <Link href={`/invoices/${inv.id}`} className="font-mono text-blue-600 hover:underline">{inv.number}</Link>
                </TableCell>
                <TableCell className="font-medium">{inv.client.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(inv.issueDate)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</TableCell>
                <TableCell className="text-end tabular-nums font-medium">{formatMoney(inv.total, inv.currency)}</TableCell>
                <TableCell><StatusBadge status={inv.status} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild><Link href={`/invoices/${inv.id}/edit`}>تعديل</Link></Button>
                    <Button variant="ghost" size="sm" onClick={() => copyShare(inv.number, inv.status)} title="نسخ رابط المشاركة">🔗</Button>
                    <Button variant="ghost" size="sm" onClick={() => archive(inv.id)} title="أرشفة">🗄️</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => del(inv.id, inv.number)}>حذف</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">لا توجد فواتير</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
