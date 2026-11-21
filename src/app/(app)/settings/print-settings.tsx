"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LetterheadDocument } from "@/components/letterhead/document-template";
import { LetterheadSheet } from "@/components/letterhead/letterhead";
import { SignBlock } from "@/components/letterhead/sign-block";
import {
  DEFAULT_PRINT_SETTINGS, signFor, type PrintSettings, type SignAssets,
} from "@/lib/print-settings";
import type { InvoiceDTO } from "@/lib/types";

type Section = keyof PrintSettings;
type PreviewKind = "quote" | "invoice" | "letter";

/** قسم إعدادات الطباعة: الترويسة، الختم والتوقيع، نصوص القوالب — مع معاينة حية */
export function PrintSettingsSection() {
  const [s, setS] = useState<PrintSettings | null>(null);
  const [assets, setAssets] = useState<SignAssets>({ stampUrl: null, signatureUrl: null });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<PreviewKind>("quote");

  useEffect(() => {
    fetch("/api/settings/print").then((r) => r.json()).then(setS);
    fetch("/api/settings").then((r) => r.json()).then((d) =>
      setAssets({ stampUrl: d.stampUrl ?? null, signatureUrl: d.signatureUrl ?? null }));
  }, []);

  useEffect(() => {
    if (s && window.location.hash === "#print") {
      document.getElementById("print")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [s]);

  if (!s) return null;

  function set<K extends Section>(section: K, key: keyof PrintSettings[K], value: unknown) {
    setS((p) => (p ? { ...p, [section]: { ...p[section], [key]: value } } : p));
    setDirty(true);
  }
  const lh = (k: keyof PrintSettings["letterhead"], v: unknown) => set("letterhead", k, v);
  const sg = (k: keyof PrintSettings["sign"], v: unknown) => set("sign", k, v);
  const tp = (k: keyof PrintSettings["templates"], v: unknown) => set("templates", k, v);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/print", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "فشل الحفظ"); return; }
      setS(await res.json());
      setDirty(false);
      toast.success("تم حفظ إعدادات الطباعة");
    } finally { setSaving(false); }
  }

  function resetTemplates() {
    setS((p) => (p ? { ...p, templates: DEFAULT_PRINT_SETTINGS.templates } : p));
    setDirty(true);
  }

  async function uploadAsset(field: "stampUrl" | "signatureUrl", dataUrl: string | null) {
    setAssets((p) => ({ ...p, [field]: dataUrl }));
    const res = await fetch("/api/settings/upload", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, dataUrl }),
    });
    if (res.ok) toast.success(dataUrl ? "تم حفظ الصورة" : "تم الحذف");
    else toast.error("فشل رفع الصورة");
  }

  return (
    <div id="print" className="space-y-4 scroll-mt-20">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold flex-1">الطباعة: الترويسة والختم والقوالب</h2>
        {dirty && <span className="text-xs text-amber-600">تغييرات غير محفوظة</span>}
        <Button type="button" onClick={save} loading={saving} disabled={!dirty}>حفظ إعدادات الطباعة</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6 min-w-0">
          {/* الترويسة */}
          <Card>
            <CardHeader>
              <CardTitle>الترويسة</CardTitle>
              <p className="text-sm text-muted-foreground">تظهر أعلى وأسفل كل فاتورة وعرض سعر وخطاب</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Toggle checked={s.letterhead.enabled} onChange={(v) => lh("enabled", v)}
                label="تفعيل الترويسة في الطباعة"
                hint="أطفئها إذا كنت تطبع على ورق عليه ترويسة مطبوعة مسبقاً (تبقى المساحة محجوزة)" />
              <Toggle checked={s.letterhead.showWatermark} onChange={(v) => lh("showWatermark", v)}
                label="العلامة المائية (الشعار الباهت في وسط الصفحة)" disabled={!s.letterhead.enabled} />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="اسم الشركة"><Input value={s.letterhead.name} onChange={(e) => lh("name", e.target.value)} /></Field>
                <Field label="النشاط / الوصف"><Input value={s.letterhead.tagline} onChange={(e) => lh("tagline", e.target.value)} /></Field>
                <Field label="الهاتف"><Input dir="ltr" value={s.letterhead.phone} onChange={(e) => lh("phone", e.target.value)} /></Field>
                <Field label="الموقع الإلكتروني"><Input dir="ltr" value={s.letterhead.website} onChange={(e) => lh("website", e.target.value)} /></Field>
                <Field label="العنوان" className="sm:col-span-2"><Input value={s.letterhead.address} onChange={(e) => lh("address", e.target.value)} /></Field>
              </div>
              <ImageField
                label="شعار الشركة (اختياري)"
                hint="إذا رفعت الشعار الأصلي يحل محل الشعار المرسوم والاسم في الترويسة"
                value={s.letterhead.logoUrl}
                onChange={(url) => lh("logoUrl", url)}
                removeWhiteDefault={false}
              />
            </CardContent>
          </Card>

          {/* الختم والتوقيع */}
          <Card>
            <CardHeader>
              <CardTitle>الختم والتوقيع</CardTitle>
              <p className="text-sm text-muted-foreground">الصور تُحفظ فور رفعها. الحجم والموضع يُحفظان بزر الحفظ.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-6">
                <ImageField label="التوقيع" value={assets.signatureUrl}
                  onChange={(url) => uploadAsset("signatureUrl", url)} removeWhiteDefault />
                <ImageField label="ختم الشركة" value={assets.stampUrl}
                  onChange={(url) => uploadAsset("stampUrl", url)} removeWhiteDefault />
              </div>

              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                <Toggle checked={s.sign.showSignature} onChange={(v) => sg("showSignature", v)} label="إظهار التوقيع" />
                <Toggle checked={s.sign.showStamp} onChange={(v) => sg("showStamp", v)} label="إظهار الختم" />
              </div>

              <div className="space-y-1.5">
                <Label>يظهر في</Label>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <Toggle checked={s.sign.onInvoice} onChange={(v) => sg("onInvoice", v)} label="الفواتير" />
                  <Toggle checked={s.sign.onQuote} onChange={(v) => sg("onQuote", v)} label="عروض الأسعار" />
                  <Toggle checked={s.sign.onLetter} onChange={(v) => sg("onLetter", v)} label="الخطابات" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="الموضع في الصفحة">
                  <Select value={s.sign.position} onChange={(e) => sg("position", e.target.value)}>
                    <option value="start">يمين</option>
                    <option value="center">وسط</option>
                    <option value="end">يسار</option>
                  </Select>
                </Field>
                <Field label="طريقة العرض">
                  <Select value={s.sign.overlap ? "overlap" : "split"} onChange={(e) => sg("overlap", e.target.value === "overlap")}>
                    <option value="split">التوقيع والختم جنباً إلى جنب</option>
                    <option value="overlap">الختم فوق التوقيع</option>
                  </Select>
                </Field>
                <Range label="حجم التوقيع" unit="مم" min={10} max={45} value={s.sign.signatureSize} onChange={(v) => sg("signatureSize", v)} />
                <Range label="حجم الختم" unit="مم" min={15} max={55} value={s.sign.stampSize} onChange={(v) => sg("stampSize", v)} />
                <Range label="إمالة الختم" unit="°" min={-30} max={30} value={s.sign.stampRotation} onChange={(v) => sg("stampRotation", v)} />
                <Field label="اسم الموقّع (اختياري)">
                  <Input value={s.sign.signatoryName} placeholder="مثال: م. أحمد علي" onChange={(e) => sg("signatoryName", e.target.value)} />
                </Field>
                <Field label="عنوان خانة التوقيع"><Input value={s.sign.signatureLabel} onChange={(e) => sg("signatureLabel", e.target.value)} /></Field>
                <Field label="عنوان خانة الختم"><Input value={s.sign.stampLabel} onChange={(e) => sg("stampLabel", e.target.value)} /></Field>
              </div>
            </CardContent>
          </Card>

          {/* نصوص القوالب */}
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>نصوص القوالب الجاهزة</CardTitle>
                <p className="text-sm text-muted-foreground mt-1.5">النصوص الثابتة التي تظهر في كل مستند مطبوع</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={resetTemplates}>استعادة الافتراضي</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="عنوان الفاتورة"><Input value={s.templates.invoiceTitle} onChange={(e) => tp("invoiceTitle", e.target.value)} /></Field>
                <Field label="عنوان عرض السعر"><Input value={s.templates.quoteTitle} onChange={(e) => tp("quoteTitle", e.target.value)} /></Field>
              </div>
              <Field label="مقدمة عرض السعر">
                <Textarea rows={2} value={s.templates.quoteIntro} onChange={(e) => tp("quoteIntro", e.target.value)} />
              </Field>
              <Field label="صلاحية العرض" hint="اكتب {date} ليُستبدل بتاريخ انتهاء العرض">
                <Input value={s.templates.quoteValidity} onChange={(e) => tp("quoteValidity", e.target.value)} />
              </Field>
              <Field label="شروط وأحكام عرض السعر" hint="مثل مدة التوريد وطريقة الدفع. اتركه فارغاً لإخفائه">
                <Textarea rows={3} value={s.templates.quoteTerms} onChange={(e) => tp("quoteTerms", e.target.value)} />
              </Field>
              <Field label="شروط وأحكام الفاتورة" hint="مثل بيانات الحساب البنكي أو سياسة الاسترجاع">
                <Textarea rows={3} value={s.templates.invoiceTerms} onChange={(e) => tp("invoiceTerms", e.target.value)} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="افتتاحية الخطاب"><Input value={s.templates.letterGreeting} onChange={(e) => tp("letterGreeting", e.target.value)} /></Field>
                <Field label="صفة الموقّع الافتراضية"><Input value={s.templates.defaultSignatory} onChange={(e) => tp("defaultSignatory", e.target.value)} /></Field>
                <Field label="خاتمة الخطاب" className="sm:col-span-2"><Input value={s.templates.letterClosing} onChange={(e) => tp("letterClosing", e.target.value)} /></Field>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* معاينة حية */}
        <div className="lg:sticky lg:top-20 self-start space-y-2">
          <div className="flex gap-1.5">
            {([["quote", "عرض سعر"], ["invoice", "فاتورة"], ["letter", "خطاب"]] as const).map(([k, label]) => (
              <Button key={k} type="button" size="sm" variant={preview === k ? "default" : "outline"} onClick={() => setPreview(k)}>
                {label}
              </Button>
            ))}
          </div>
          <div className="rounded-lg border bg-slate-200 overflow-hidden">
            <div className="print-preview">
              {preview === "letter" ? <SampleLetter s={s} assets={assets} /> : (
                <LetterheadDocument kind={preview} invoice={SAMPLE_INVOICE} settings={s} assets={assets} />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">معاينة ببيانات تجريبية. احفظ ثم افتح أي مستند للطباعة.</p>
        </div>
      </div>
    </div>
  );
}

function SampleLetter({ s, assets }: { s: PrintSettings; assets: SignAssets }) {
  return (
    <LetterheadSheet letterhead={s.letterhead}>
      <div className="lh-letter">
        <div className="lh-letter-meta"><div>التاريخ: 21 نوفمبر 2026</div><div>الإشاري: ص/2026/0001</div></div>
        <p className="lh-letter-to">السادة / الشركة العامة للكهرباء المحترمين</p>
        <p className="lh-letter-subject">الموضوع: طلب تجديد عقد الصيانة</p>
        {s.templates.letterGreeting && <p>{s.templates.letterGreeting}</p>}
        <div className="lh-letter-body lh-letter-body-saved">نص الخطاب يظهر هنا...</div>
        {s.templates.letterClosing && <p>{s.templates.letterClosing}</p>}
        <SignBlock sign={s.sign} assets={signFor("letter", s, assets)} signatory={s.templates.defaultSignatory} />
      </div>
    </LetterheadSheet>
  );
}

const SAMPLE_INVOICE: InvoiceDTO = {
  id: "sample", number: "INV-2026-0001", status: "SENT",
  issueDate: "2026-11-21T00:00:00.000Z", dueDate: "2026-12-05T00:00:00.000Z",
  currency: "LYD", taxRate: 0, discount: 0, subtotal: 4350, taxAmount: 0, total: 4350,
  notes: null, paidAt: null, archivedAt: null, shareToken: "sample", createdByAI: false,
  client: { id: "c", name: "شركة النموذج للتجارة", email: null, phone: "+218-91-0000000", address: "طرابلس", taxNumber: null, notes: null } as InvoiceDTO["client"],
  items: [
    { id: "1", productId: null, description: "راوتر Wi-Fi 6", unit: "قطعة", quantity: 3, unitPrice: 450, lineTotal: 1350 },
    { id: "2", productId: null, description: "تمديد شبكة وتركيب", unit: "خدمة", quantity: 1, unitPrice: 3000, lineTotal: 3000 },
  ] as unknown as InvoiceDTO["items"],
};

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-2.5 text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function Range({ label, unit, min, max, value, onChange }: {
  label: string; unit: string; min: number; max: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm"><Label>{label}</Label><span className="tabular-nums text-muted-foreground" dir="ltr">{value}{unit}</span></div>
      <input type="range" min={min} max={max} value={value} className="w-full accent-primary"
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

/** يصغّر الصورة ويحوّلها PNG، ويزيل الخلفية البيضاء اختيارياً (مفيد لصور الختم والتوقيع الممسوحة) */
async function processImage(file: File, removeWhite: boolean, maxSide = 900): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    if (removeWhite) {
      const data = ctx.getImageData(0, 0, w, h);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const light = Math.min(px[i], px[i + 1], px[i + 2]);
        // الأبيض يصبح شفافاً بالكامل، والرمادي الفاتح شفافاً جزئياً لحواف ناعمة
        if (light > 235) px[i + 3] = 0;
        else if (light > 200) px[i + 3] = Math.round(px[i + 3] * (235 - light) / 35);
      }
      ctx.putImageData(data, 0, 0);
    }
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ImageField({ label, hint, value, onChange, removeWhiteDefault }: {
  label: string; hint?: string; value: string | null; onChange: (url: string | null) => void; removeWhiteDefault: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [removeWhite, setRemoveWhite] = useState(removeWhiteDefault);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("الصورة أكبر من 8MB"); return; }
    setBusy(true);
    try { onChange(await processImage(file, removeWhite)); }
    catch { toast.error("تعذّر قراءة الصورة"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className="h-28 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary transition-colors bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px]"
        onClick={() => ref.current?.click()}
      >
        {value ? <img src={value} alt={label} className="max-h-24 max-w-full object-contain" /> : (
          <div className="text-center text-xs text-muted-foreground">
            <div className="text-2xl mb-1">📎</div>
            {busy ? "جار المعالجة..." : "اضغط لرفع صورة (PNG/JPG)"}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} loading={busy}>
          {value ? "تغيير" : "رفع"}
        </Button>
        {value && <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>حذف</Button>}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" className="accent-primary" checked={removeWhite} onChange={(e) => setRemoveWhite(e.target.checked)} />
          إزالة الخلفية البيضاء
        </label>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
}
