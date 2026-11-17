"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClientDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const empty = (): Partial<ClientDTO> => ({ name: "", email: "", phone: "", address: "", taxNumber: "", notes: "" });

export function ClientsManager({ clients: initial }: { clients: ClientDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<ClientDTO> | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = initial.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()));

  async function save() {
    if (!editing?.name?.trim()) { toast.error("الاسم مطلوب"); return; }
    setSaving(true);
    try {
      const res = await fetch(editing.id ? `/api/clients/${editing.id}` : "/api/clients", {
        method: editing.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "فشل الحفظ"); return; }
      toast.success(editing.id ? "تم تحديث العميل" : "تم إضافة العميل");
      setEditing(null);
      startTransition(() => router.refresh());
    } finally { setSaving(false); }
  }

  async function del(id: string, name: string) {
    if (!confirm(`حذف العميل "${name}"؟`)) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error((await res.json()).error ?? "فشل الحذف"); return; }
    toast.success("تم حذف العميل");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">العملاء</h1>
        <Button onClick={() => setEditing(empty())}>+ عميل جديد</Button>
      </div>
      <Input placeholder="🔍 بحث..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>البريد الإلكتروني</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead className="text-center">الفواتير</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                <TableCell className="text-center">{c._count?.invoices ?? 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>تعديل</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => del(c.id, c.name)}>حذف</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">لا يوجد عملاء</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "تعديل العميل" : "عميل جديد"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>الاسم *</Label>
                  <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>الهاتف</Label>
                  <Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>رقم الضريبة</Label>
                  <Input value={editing.taxNumber ?? ""} onChange={(e) => setEditing({ ...editing, taxNumber: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>العنوان</Label>
                  <Textarea value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} rows={2} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
            <Button loading={saving} onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
