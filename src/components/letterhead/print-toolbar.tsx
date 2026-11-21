"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  backHref?: string;
  /** روابط التبديل بين أنواع المستند (فاتورة / عرض سعر) */
  switches?: { href: string; label: string; active: boolean }[];
  hint?: string;
  /** إظهار رابط تعديل الترويسة والقوالب والختم */
  settingsHref?: boolean;
}

export function PrintToolbar({ backHref, switches, hint, settingsHref }: Props) {
  return (
    <div className="lh-toolbar">
      <div className="lh-toolbar-inner">
        {backHref && (
          <Button variant="outline" size="sm" asChild>
            <Link href={backHref}>→ رجوع</Link>
          </Button>
        )}
        {switches?.map((s) => (
          <Button key={s.href} variant={s.active ? "default" : "outline"} size="sm" asChild>
            <Link href={s.href} replace>{s.label}</Link>
          </Button>
        ))}
        <div className="flex-1 text-xs text-muted-foreground">{hint}</div>
        {settingsHref && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings#print">⚙️ تعديل الترويسة والختم</Link>
          </Button>
        )}
        <Button size="sm" onClick={() => window.print()}>🖨️ طباعة / حفظ PDF</Button>
      </div>
    </div>
  );
}
