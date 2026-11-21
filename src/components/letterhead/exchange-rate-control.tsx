"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { InvoiceDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";

/**
 * زر إظهار/إخفاء سعر الصرف في الفاتورة المطبوعة، مع خانة لإدخال السعر.
 * الاختيار يُحفظ مع الفاتورة فيبقى كما هو عند الطباعة لاحقاً وفي رابط العميل.
 */
export function ExchangeRateControl({ invoice: inv }: { invoice: InvoiceDTO }) {
  const router = useRouter();
  const [rate, setRate] = useState(inv.exchangeRate ? String(inv.exchangeRate) : "");
  const savedTarget =
    inv.exchangeCurrency !== inv.currency ? inv.exchangeCurrency : inv.currency === "LYD" ? "USD" : "LYD";
  const [target, setTarget] = useState(savedTarget);
  const [saving, setSaving] = useState(false);

  const visible = inv.showExchangeRate && Boolean(inv.exchangeRate);
  const dirty = rate !== (inv.exchangeRate ? String(inv.exchangeRate) : "") || target !== savedTarget;

  async function save(patch: { exchangeRate?: number | null; exchangeCurrency?: string; showExchangeRate?: boolean }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${inv.id}/exchange-rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "تعذر الحفظ");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  function toggle() {
    const n = Number(rate);
    if (!visible) {
      if (!(n > 0)) {
        toast.error("أدخل سعر الصرف أولاً");
        return;
      }
      save({ exchangeRate: n, exchangeCurrency: target, showExchangeRate: true });
    } else if (dirty && n > 0) {
      save({ exchangeRate: n, exchangeCurrency: target });
    } else {
      save({ showExchangeRate: false });
    }
  }

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
      <span className="text-slate-500 whitespace-nowrap">سعر الصرف</span>
      <span dir="ltr" style={{ direction: "ltr" }} className="flex items-center gap-1">
        1 {inv.currency} =
        <input
          type="number" min="0" step="any" inputMode="decimal" value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="0.00"
          className="w-20 rounded border border-slate-300 px-1.5 py-0.5 text-end tabular-nums"
        />
        <select
          value={target} onChange={(e) => setTarget(e.target.value)}
          className="rounded border border-slate-300 px-1 py-0.5"
        >
          {["LYD", "USD", "EUR", "SAR", "AED", "EGP", "KWD"].filter((c) => c !== inv.currency).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </span>
      <Button
        type="button" size="sm" variant={visible ? "default" : "outline"}
        className="h-7 px-2 text-xs" loading={saving} onClick={toggle}
      >
        {!visible ? "👁 إظهار في الفاتورة" : dirty ? "💾 حفظ السعر" : "🙈 إخفاء من الفاتورة"}
      </Button>
    </div>
  );
}
