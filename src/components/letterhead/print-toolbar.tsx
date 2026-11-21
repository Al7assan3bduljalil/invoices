"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  backHref?: string;
  /** روابط التبديل بين أنواع المستند (فاتورة / عرض سعر) */
  switches?: { href: string; label: string; active: boolean }[];
  hint?: string;
  /** أدوات إضافية تظهر في الشريط (مثل زر سعر الصرف) */
  children?: ReactNode;
}

export function PrintToolbar({ backHref, switches, hint, children }: Props) {
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
        {children}
        <div className="flex-1 text-xs text-muted-foreground">{hint}</div>
        <Button size="sm" onClick={() => window.print()}>🖨️ طباعة / حفظ PDF</Button>
      </div>
    </div>
  );
}
