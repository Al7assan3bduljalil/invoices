"use client";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InvoiceDTO } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/invoice/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export function ArchiveTable({ invoices }: { invoices: InvoiceDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function restore(id: string) {
    const res = await fetch(`/api/invoices/${id}/archive`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (!res.ok) { toast.error("فشل الاسترجاع"); return; }
    toast.success("تم استرجاع الفاتورة");
    startTransition(() => router.refresh());
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رقم الفاتورة</TableHead>
            <TableHead>العميل</TableHead>
            <TableHead>تاريخ الإصدار</TableHead>
            <TableHead>تاريخ الأرشفة</TableHead>
            <TableHead className="text-end">المبلغ</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id} className="opacity-80">
              <TableCell>
                <Link href={`/invoices/${inv.id}`} className="font-mono text-blue-600 hover:underline">{inv.number}</Link>
              </TableCell>
              <TableCell>{inv.client.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(inv.issueDate)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{inv.archivedAt ? formatDate(inv.archivedAt) : "—"}</TableCell>
              <TableCell className="text-end tabular-nums">{formatMoney(inv.total, inv.currency)}</TableCell>
              <TableCell><StatusBadge status={inv.status} /></TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => restore(inv.id)}>📤 استرجاع</Button>
              </TableCell>
            </TableRow>
          ))}
          {invoices.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">الأرشيف فارغ</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
