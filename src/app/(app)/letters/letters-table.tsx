"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DIRECTION_LABELS,
  STATUS_VARIANT,
  statusLabel,
  type LetterDirectionValue,
  type LetterDTO,
} from "@/lib/letters";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Tab = "ALL" | LetterDirectionValue;
const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "الكل" },
  { key: "OUTGOING", label: "الصادر" },
  { key: "INCOMING", label: "الوارد" },
];

export function LettersTable({ letters }: { letters: LetterDTO[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("ALL");

  const needle = q.trim().toLowerCase();
  const filtered = letters.filter(
    (l) =>
      (tab === "ALL" || l.direction === tab) &&
      (!needle ||
        [l.number, l.subject, l.party, l.externalRef ?? "", l.client?.name ?? ""].some((s) =>
          s.toLowerCase().includes(needle),
        )),
  );
  const count = (t: Tab) => (t === "ALL" ? letters.length : letters.filter((l) => l.direction === t).length);

  async function del(l: LetterDTO) {
    if (!confirm(`حذف المراسلة ${l.number}؟`)) return;
    const res = await fetch(`/api/letters/${l.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error((await res.json()).error ?? "فشل الحذف"); return; }
    toast.success("تم حذف المراسلة");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">المراسلات</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/letters/new?direction=INCOMING">+ تسجيل وارد</Link>
          </Button>
          <Button asChild>
            <Link href="/letters/new">+ خطاب صادر</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                tab === t.key ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
              )}>
              {t.label} <span className="text-xs text-muted-foreground">({count(t.key)})</span>
            </button>
          ))}
        </div>
        <Input placeholder="🔍 بحث بالرقم أو الموضوع أو الجهة..." value={q}
          onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      </div>

      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الرقم الإشاري</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الجهة</TableHead>
              <TableHead>الموضوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <Link href={`/letters/${l.id}`} className="hover:underline"><bdi>{l.number}</bdi></Link>
                </TableCell>
                <TableCell>
                  <Badge variant={l.direction === "OUTGOING" ? "default" : "warning"}>{DIRECTION_LABELS[l.direction]}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(l.date)}</TableCell>
                <TableCell className="whitespace-nowrap">{l.party}</TableCell>
                <TableCell className="max-w-[18rem] truncate" title={l.subject}>{l.subject}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[l.status]}>{statusLabel(l.status, l.direction)}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild><Link href={`/letters/${l.id}`}>فتح</Link></Button>
                    {l.direction === "OUTGOING" && (
                      <Button variant="ghost" size="sm" asChild><Link href={`/print/letters/${l.id}`}>طباعة</Link></Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => del(l)}>حذف</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  {letters.length === 0 ? "لا توجد مراسلات بعد — ابدأ بإنشاء خطاب صادر" : "لا توجد نتائج"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        تحتاج ورقة فارغة بالترويسة؟ <Link href="/print/letter" className="underline">افتح خطاباً فارغاً</Link>
      </p>
    </div>
  );
}
