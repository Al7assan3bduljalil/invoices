"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PrintSettingsSection } from "./print-settings";

type Settings = {
  name: string; email: string; companyName: string | null; companyAddress: string | null;
  taxNumber: string | null; phone: string | null; currency: string;
  defaultTaxRate: number; invoicePrefix: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { stampUrl, signatureUrl, ...rest } = d;
      setSettings(rest);
    });
  }, []);

  if (!settings) return <div className="text-center py-16 text-muted-foreground">جار التحميل...</div>;

  const set = (k: keyof Settings, v: unknown) => setSettings((p) => p ? { ...p, [k]: v } : p);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "فشل الحفظ"); return; }
      toast.success("تم حفظ الإعدادات");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-10 max-w-6xl">
    <form onSubmit={save} className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">الإعدادات</h1>

      <Card>
        <CardHeader><CardTitle>معلومات التاجر</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>الاسم *</Label><Input value={settings.name} onChange={(e) => set("name", e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>البريد الإلكتروني *</Label><Input type="email" value={settings.email} onChange={(e) => set("email", e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>اسم الشركة</Label><Input value={settings.companyName ?? ""} onChange={(e) => set("companyName", e.target.value || null)} /></div>
          <div className="space-y-1.5"><Label>الهاتف</Label><Input value={settings.phone ?? ""} onChange={(e) => set("phone", e.target.value || null)} /></div>
          <div className="col-span-2 space-y-1.5"><Label>عنوان الشركة</Label><Input value={settings.companyAddress ?? ""} onChange={(e) => set("companyAddress", e.target.value || null)} /></div>
          <div className="space-y-1.5"><Label>الرقم الضريبي</Label><Input value={settings.taxNumber ?? ""} onChange={(e) => set("taxNumber", e.target.value || null)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>إعدادات الفوترة</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>العملة الافتراضية</Label>
            <Select value={settings.currency} onChange={(e) => set("currency", e.target.value)}>
              {["USD","SAR","AED","EGP","KWD","LYD","EUR"].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5"><Label>نسبة الضريبة الافتراضية (%)</Label>
            <Input type="number" min="0" max="100" value={settings.defaultTaxRate} onChange={(e) => set("defaultTaxRate", Number(e.target.value))} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>بادئة رقم الفاتورة</Label>
            <Input value={settings.invoicePrefix} maxLength={10} onChange={(e) => set("invoicePrefix", e.target.value)} />
            <p className="text-xs text-muted-foreground">مثال: INV → INV-2026-0001</p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" loading={saving}>حفظ الإعدادات</Button>
    </form>
    <PrintSettingsSection />
    </div>
  );
}
