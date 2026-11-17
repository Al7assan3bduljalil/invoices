"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductDTO } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const empty = (): Partial<ProductDTO> => ({ name: "", description: "", unit: "وحدة", price: 0, taxRate: null, isActive: true });

export function ProductsManager({ products: initial }: { products: ProductDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<ProductDTO> | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = initial.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  async function save() {
    if (!editing?.name?.trim()) { toast.error("الاسم مطلوب"); return; }
    setSaving(true);
    try {
      const res = await fetch(editing.id ? `/api/products/${editing.id}` : "/api/products", {
        method: editing.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "فشل الحفظ"); return; }
      toast.success(editing.id ? "تم التحديث" : "تمت الإضافة");
      setEditing(null);
      startTransition(() => router.refresh());
    } finally { setSaving(false); }
  }

  async function del(id: string, name: string) {
    if (!confirm(`حذف "${name}"؟`)) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error((await res.json()).error ?? "فشل الحذف"); return; }
    toast.success("تم الحذف");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المنتجات والخدمات</h1>
        <Button onClick={() => setEditing(empty())}>+ إضافة</Button>
      </div>
      <Input placeholder="🔍 بحث..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الوحدة</TableHead>
              <TableHead className="text-end">السعر</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <p className="font-medium">{p.name}</p>
                  {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                </TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell className="text-end tabular-nums">{formatMoney(p.price, "USD")}</TableCell>
                <TableCell className="text-center">{p.isActive ? "✅" : "⏸️"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>تعديل</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => del(p.id, p.name)}>حذف</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">لا توجد منتجات</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "تعديل" : "إضافة منتج / خدمة"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>الاسم *</Label>
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>الوصف</Label>
                <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>السعر</Label>
                <Input type="number" min="0" step="any" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>الوحدة</Label>
                <Input value={editing.unit ?? "وحدة"} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>نسبة الضريبة (%)</Label>
                <Input type="number" min="0" max="100" step="any" value={editing.taxRate ?? ""} placeholder="الافتراضي"
                  onChange={(e) => setEditing({ ...editing, taxRate: e.target.value ? Number(e.target.value) : null })} />
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
