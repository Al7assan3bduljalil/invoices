"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ClientDTO } from "@/lib/types";
import {
  DIRECTION_LABELS,
  LETTER_STATUSES,
  statusLabel,
  type LetterDirectionValue,
  type LetterDTO,
  type LetterStatusValue,
} from "@/lib/letters";
import { cn, toDateInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  letter?: LetterDTO;
  clients: Pick<ClientDTO, "id" | "name">[];
  defaultDirection?: LetterDirectionValue;
  defaultClientId?: string;
  aiEnabled: boolean;
}

type FormState = {
  direction: LetterDirectionValue;
  status: LetterStatusValue;
  date: string;
  clientId: string;
  party: string;
  partyTitle: string;
  externalRef: string;
  subject: string;
  body: string;
  signatory: string;
  cc: string;
  notes: string;
};

export function LetterForm({ letter, clients, defaultDirection = "OUTGOING", defaultClientId, aiEnabled }: Props) {
  const router = useRouter();
  const initialClient = clients.find((c) => c.id === (letter?.clientId ?? defaultClientId));
  const [f, setF] = useState<FormState>({
    direction: letter?.direction ?? defaultDirection,
    status: letter?.status ?? "DRAFT",
    date: toDateInput(letter?.date ?? new Date()),
    clientId: initialClient?.id ?? "",
    party: letter?.party ?? initialClient?.name ?? "",
    partyTitle: letter?.partyTitle ?? "المحترمين",
    externalRef: letter?.externalRef ?? "",
    subject: letter?.subject ?? "",
    body: letter?.body ?? "",
    signatory: letter?.signatory ?? "المدير العام",
    cc: letter?.cc ?? "",
    notes: letter?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [points, setPoints] = useState("");
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const outgoing = f.direction === "OUTGOING";

  function pickClient(id: string) {
    const c = clients.find((x) => x.id === id);
    setF((p) => ({ ...p, clientId: id, party: c ? c.name : p.party }));
  }

  async function save(thenPrint = false) {
    if (!f.subject.trim()) { toast.error("الموضوع مطلوب"); return; }
    if (!f.party.trim()) { toast.error(outgoing ? "اسم الجهة المرسَل إليها مطلوب" : "اسم الجهة المرسِلة مطلوب"); return; }
    setSaving(true);
    try {
      const res = await fetch(letter ? `/api/letters/${letter.id}` : "/api/letters", {
        method: letter ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, clientId: f.clientId || null }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "فشل الحفظ"); return; }
      toast.success(letter ? "تم حفظ التعديلات" : `تم إنشاء المراسلة ${data.number}`);
      if (thenPrint) router.push(`/print/letters/${data.id}`);
      else if (!letter) router.replace(`/letters/${data.id}`);
      else router.refresh();
    } finally { setSaving(false); }
  }

  async function del() {
    if (!letter || !confirm(`حذف المراسلة ${letter.number}؟`)) return;
    const res = await fetch(`/api/letters/${letter.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error((await res.json()).error ?? "فشل الحذف"); return; }
    toast.success("تم حذف المراسلة");
    router.push("/letters");
    router.refresh();
  }

  async function draft() {
    if (!f.subject.trim()) { toast.error("اكتب الموضوع أولاً"); return; }
    setDrafting(true);
    try {
      const res = await fetch("/api/letters/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: f.subject, party: f.party, points, current: f.body }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "تعذرت الصياغة"); return; }
      set("body", data.body);
      toast.success("تمت صياغة النص — راجعه قبل الحفظ");
    } finally { setDrafting(false); }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {letter ? `مراسلة ${DIRECTION_LABELS[letter.direction]}` : outgoing ? "خطاب صادر جديد" : "تسجيل مراسلة واردة"}
          </h1>
          {letter && (
            <p className="text-sm text-muted-foreground mt-1">
              الرقم الإشاري: <bdi className="font-medium text-foreground">{letter.number}</bdi>
              {letter.createdByAI && " · أنشأه المساعد الذكي"}
            </p>
          )}
        </div>
        <Button variant="outline" asChild><Link href="/letters">→ المراسلات</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">بيانات المراسلة</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>النوع</Label>
            <div className="inline-flex rounded-lg border p-0.5 bg-muted/40 w-full">
              {(["OUTGOING", "INCOMING"] as const).map((d) => (
                <button key={d} type="button" onClick={() => set("direction", d)}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                    f.direction === d ? "bg-background shadow-sm font-medium" : "text-muted-foreground",
                  )}>
                  {DIRECTION_LABELS[d]}
                </button>
              ))}
            </div>
            {letter && f.direction !== letter.direction && (
              <p className="text-xs text-amber-600">سيُعطى رقم إشاري جديد عند الحفظ</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>التاريخ</Label>
              <Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>الحالة</Label>
              <Select value={f.status} onChange={(e) => set("status", e.target.value as LetterStatusValue)}>
                {LETTER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s, f.direction)}</option>)}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>ربط بعميل (اختياري)</Label>
            <Select value={f.clientId} onChange={(e) => pickClient(e.target.value)}>
              <option value="">— بدون —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{outgoing ? "إلى السادة / الجهة *" : "من الجهة *"}</Label>
            <Input value={f.party} onChange={(e) => set("party", e.target.value)}
              placeholder={outgoing ? "مثال: شركة الأمل للتجارة" : "اسم الجهة المرسِلة"} />
          </div>

          {outgoing ? (
            <div className="space-y-1.5">
              <Label>لقب المخاطَب</Label>
              <Input value={f.partyTitle} onChange={(e) => set("partyTitle", e.target.value)} placeholder="المحترمين" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>رقمهم الإشاري</Label>
              <Input value={f.externalRef} onChange={(e) => set("externalRef", e.target.value)} placeholder="رقم الخطاب لدى الجهة المرسِلة" />
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>الموضوع *</Label>
            <Input value={f.subject} onChange={(e) => set("subject", e.target.value)} placeholder="مثال: طلب تمديد فترة العرض" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">{outgoing ? "نص الخطاب" : "ملخص / نص المراسلة"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {outgoing && aiEnabled && (
            <div className="rounded-lg border border-dashed p-3 space-y-2 bg-muted/30">
              <Label className="text-xs">✨ صياغة بالمساعد الذكي: اكتب النقاط الرئيسية (اختياري) ثم اضغط «صياغة»</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Textarea rows={2} value={points} onChange={(e) => setPoints(e.target.value)}
                  placeholder="مثال: نشكرهم على التعاون، نطلب تمديد العرض أسبوعين، التواصل مع قسم المبيعات" />
                <Button type="button" variant="outline" loading={drafting} onClick={draft} className="sm:self-end">
                  {f.body.trim() ? "تحسين النص" : "صياغة"}
                </Button>
              </div>
            </div>
          )}
          <Textarea rows={12} value={f.body} onChange={(e) => set("body", e.target.value)}
            className="leading-8"
            placeholder={outgoing
              ? "اكتب متن الخطاب هنا. تُضاف «تحية طيبة وبعد» والخاتمة والتوقيع تلقائياً عند الطباعة."
              : "ملخص محتوى المراسلة الواردة"} />
          {outgoing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>صفة الموقّع</Label>
                <Input value={f.signatory} onChange={(e) => set("signatory", e.target.value)} placeholder="المدير العام" />
              </div>
              <div className="space-y-1.5">
                <Label>نسخة إلى (اختياري)</Label>
                <Input value={f.cc} onChange={(e) => set("cc", e.target.value)} placeholder="مثال: الملف، قسم المبيعات" />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>ملاحظات داخلية (لا تُطبع)</Label>
            <Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button loading={saving} onClick={() => save(false)}>حفظ</Button>
        {outgoing && (
          <Button variant="outline" disabled={saving} onClick={() => save(true)}>حفظ وطباعة 🖨️</Button>
        )}
        {letter && (
          <Button variant="ghost" className="text-destructive ms-auto" onClick={del}>حذف</Button>
        )}
      </div>
    </div>
  );
}
