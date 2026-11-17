"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Settings = {
  name: string; email: string; companyName: string | null; companyAddress: string | null;
  taxNumber: string | null; phone: string | null; currency: string;
  defaultTaxRate: number; invoicePrefix: string;
};

type Branding = { stampUrl: string | null; signatureUrl: string | null };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [branding, setBranding] = useState<Branding>({ stampUrl: null, signatureUrl: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      const { stampUrl, signatureUrl, ...rest } = d;
      setSettings(rest);
      setBranding({ stampUrl: stampUrl ?? null, signatureUrl: signatureUrl ?? null });
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

      {/* Stamp & Signature */}
      <Card>
        <CardHeader>
          <CardTitle>الختم والتوقيع</CardTitle>
          <p className="text-sm text-muted-foreground">تظهر في أسفل الفاتورة عند الطباعة أو مشاركتها مع الزبون</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <ImageUploadField
            label="التوقيع"
            value={branding.signatureUrl}
            onChange={(url) => {
              setBranding((p) => ({ ...p, signatureUrl: url }));
              uploadBranding("signatureUrl", url);
            }}
          />
          <ImageUploadField
            label="ختم الشركة"
            value={branding.stampUrl}
            onChange={(url) => {
              setBranding((p) => ({ ...p, stampUrl: url }));
              uploadBranding("stampUrl", url);
            }}
          />
        </CardContent>
      </Card>

      <Button type="submit" loading={saving}>حفظ الإعدادات</Button>
    </form>
  );
}

async function uploadBranding(field: "stampUrl" | "signatureUrl", dataUrl: string | null) {
  const res = await fetch("/api/settings/upload", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, dataUrl }),
  });
  if (res.ok) toast.success(dataUrl ? "تم رفع الصورة" : "تم الحذف");
  else toast.error("فشل رفع الصورة");
}

function ImageUploadField({ label, value, onChange }: {
  label: string; value: string | null; onChange: (url: string | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("الصورة أكبر من 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      {value ? (
        <div className="relative group">
          <img src={value} alt={label} className="h-24 object-contain rounded-lg border bg-muted w-full" />
          <button type="button"
            className="absolute top-1 end-1 w-6 h-6 rounded-full bg-destructive text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => { onChange(null); if (ref.current) ref.current.value = ""; }}>
            ✕
          </button>
        </div>
      ) : (
        <div className="h-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors bg-muted/30"
          onClick={() => ref.current?.click()}>
          <div className="text-center">
            <div className="text-2xl mb-1">📎</div>
            <p className="text-xs text-muted-foreground">اضغط لرفع صورة (PNG/JPG)</p>
          </div>
        </div>
      )}
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
      {!value && <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => ref.current?.click()}>
        رفع {label}
      </Button>}
    </div>
  );
}
