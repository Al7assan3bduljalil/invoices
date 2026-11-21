export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/server/current-user";
import { getInvoice } from "@/server/invoices";
import { LetterheadDocument } from "@/components/letterhead/document-template";
import { PrintToolbar } from "@/components/letterhead/print-toolbar";
import { DOCUMENT_LABELS, parseDocumentKind } from "@/components/letterhead/brand";
import { printContext } from "@/lib/print-settings";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> };

export async function generateMetadata({ searchParams }: Params) {
  const kind = parseDocumentKind((await searchParams).type);
  return { title: `طباعة ${DOCUMENT_LABELS[kind].title}` };
}

/** طباعة فاتورة أو عرض سعر على ترويسة الشركة: /print/invoice/{id}?type=invoice|quote */
export default async function PrintInvoicePage({ params, searchParams }: Params) {
  const { id } = await params;
  const kind = parseDocumentKind((await searchParams).type);
  const user = await getCurrentUser();
  const invoice = await getInvoice(user.id, id).catch(() => null);
  if (!invoice) notFound();
  const { settings, assets } = printContext(user);

  return (
    <div className="lh-page">
      <PrintToolbar
        backHref={`/invoices/${id}`}
        switches={(["invoice", "quote"] as const).map((k) => ({
          href: `/print/invoice/${id}?type=${k}`,
          label: (k === "quote" ? settings.templates.quoteTitle : settings.templates.invoiceTitle) || DOCUMENT_LABELS[k].title,
          active: k === kind,
        }))}
        hint="اختر الورق A4 وفعّل «رسومات الخلفية» في نافذة الطباعة"
        settingsHref
      />
      <LetterheadDocument
        kind={kind}
        invoice={invoice}
        settings={settings}
        assets={assets}
      />
    </div>
  );
}
