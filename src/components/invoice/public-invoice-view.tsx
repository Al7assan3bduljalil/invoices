"use client";
import { useState } from "react";
import type { InvoiceDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LetterheadDocument } from "@/components/letterhead/document-template";
import type { DocumentKind } from "@/components/letterhead/brand";
import type { PrintSettings, SignAssets } from "@/lib/print-settings";

interface Props {
  invoice: InvoiceDTO;
  kind?: DocumentKind;
  settings?: PrintSettings;
  assets?: SignAssets;
}

/** صفحة الزبون العامة — تعرض المستند على ترويسة الشركة وجاهزة للطباعة */
export function PublicInvoiceView({ invoice: inv, kind = "invoice", settings, assets }: Props) {
  const [copying, setCopying] = useState(false);

  async function copyLink() {
    setCopying(true);
    await navigator.clipboard.writeText(window.location.href);
    setTimeout(() => setCopying(false), 2000);
  }

  return (
    <div className="lh-page">
      <div className="lh-toolbar">
        <div className="lh-toolbar-inner">
          <div className="flex-1 text-sm text-slate-500">
            {inv.client.name} · <span className="font-mono">{inv.number}</span>
          </div>
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copying ? "✓ تم النسخ" : "🔗 نسخ الرابط"}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            🖨️ طباعة / حفظ PDF
          </Button>
        </div>
      </div>
      <LetterheadDocument kind={kind} invoice={inv} settings={settings} assets={assets} />
    </div>
  );
}
