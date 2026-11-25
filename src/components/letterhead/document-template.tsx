import type { InvoiceDTO } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { DOCUMENT_LABELS, type DocumentKind } from "./brand";
import { LetterheadSheet } from "./letterhead";
import { SignBlock } from "./sign-block";
import { DEFAULT_PRINT_SETTINGS, signFor, type PrintSettings, type SignAssets } from "@/lib/print-settings";

interface Props {
  kind: DocumentKind;
  invoice: InvoiceDTO;
  settings?: PrintSettings;
  assets?: SignAssets;
}

const CURRENCY_IN: Record<string, string> = {
  LYD: "بالدينار الليبي", USD: "بالدولار", EUR: "باليورو", SAR: "بالريال السعودي",
  AED: "بالدرهم الإماراتي", EGP: "بالجنيه المصري", KWD: "بالدينار الكويتي",
};

/** قالب الفاتورة / عرض السعر على ترويسة الشركة */
export function LetterheadDocument({
  kind, invoice: inv, settings = DEFAULT_PRINT_SETTINGS, assets = { stampUrl: null, signatureUrl: null },
}: Props) {
  const T = settings.templates;
  const L = { ...DOCUMENT_LABELS[kind], title: (kind === "quote" ? T.quoteTitle : T.invoiceTitle) || DOCUMENT_LABELS[kind].title };
  const terms = kind === "quote" ? T.quoteTerms : T.invoiceTerms;
  const money = (n: number) => formatMoney(n, inv.currency);
  const rate = inv.showExchangeRate && inv.exchangeRate ? inv.exchangeRate : null;

  return (
    <LetterheadSheet letterhead={settings.letterhead}>
      <div className="lh-doc-head">
        <div>
          <h1 className="lh-doc-title">{L.title}</h1>
          {kind === "invoice" && inv.status === "PAID" && <span className="lh-paid">مدفوعة</span>}
        </div>
        <dl className="lh-meta">
          <div><dt>{L.number}</dt><dd dir="ltr">{inv.number}</dd></div>
          <div><dt>{L.date}</dt><dd>{formatDate(inv.issueDate)}</dd></div>
          {inv.dueDate && <div><dt>{L.due}</dt><dd>{formatDate(inv.dueDate)}</dd></div>}
        </dl>
      </div>

      <section className="lh-party">
        <div className="lh-party-label">{kind === "quote" ? "مقدَّم إلى السادة" : "إلى السادة"}</div>
        <div className="lh-party-name">{inv.client.name}</div>
        <div className="lh-party-details">
          {inv.client.phone && <span>هاتف: <bdi dir="ltr">{inv.client.phone}</bdi></span>}
          {inv.client.email && <span>بريد: <bdi dir="ltr">{inv.client.email}</bdi></span>}
          {inv.client.address && <span>العنوان: {inv.client.address}</span>}
          {inv.client.taxNumber && <span>الرقم الضريبي: {inv.client.taxNumber}</span>}
        </div>
      </section>

      {kind === "quote" && T.quoteIntro && <p className="lh-intro lh-pre">{T.quoteIntro}</p>}

      <table className="lh-items">
        <thead>
          <tr>
            <th className="lh-c">#</th>
            <th>الصنف / الوصف</th>
            <th className="lh-c">الوحدة</th>
            <th className="lh-c">الكمية</th>
            <th className="lh-n">سعر الوحدة</th>
            <th className="lh-n">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((item, i) => (
            <tr key={item.id ?? i}>
              <td className="lh-c">{i + 1}</td>
              <td>{item.description}</td>
              <td className="lh-c">{item.unit}</td>
              <td className="lh-c">{item.quantity}</td>
              <td className="lh-n">{money(item.unitPrice)}</td>
              <td className="lh-n">{money(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="lh-bottom">
        <div className="lh-notes">
          {kind === "quote" && T.quoteValidity && inv.dueDate && (
            <p><strong>صلاحية العرض:</strong> {T.quoteValidity.replaceAll("{date}", formatDate(inv.dueDate))}</p>
          )}
          {inv.notes && (
            <>
              <p className="lh-notes-label">ملاحظات</p>
              <p className="lh-pre">{inv.notes}</p>
            </>
          )}
          {terms && (
            <>
              <p className="lh-notes-label">الشروط والأحكام</p>
              <p className="lh-pre">{terms}</p>
            </>
          )}
        </div>
        <table className="lh-totals">
          <tbody>
            <tr><th>المجموع الفرعي</th><td>{money(inv.subtotal)}</td></tr>
            {inv.discount > 0 && <tr><th>الخصم</th><td>- {money(inv.discount)}</td></tr>}
            {inv.taxRate > 0 && <tr><th>الضريبة ({inv.taxRate}%)</th><td>{money(inv.taxAmount)}</td></tr>}
            <tr className="lh-grand"><th>الإجمالي</th><td>{money(inv.total)}</td></tr>
            {rate && (
              <>
                <tr className="lh-fx">
                  <th>سعر الصرف</th>
                  <td><bdi dir="ltr">1 {inv.currency} = {rate.toLocaleString("en", { maximumFractionDigits: 4 })} {inv.exchangeCurrency}</bdi></td>
                </tr>
                <tr className="lh-fx">
                  <th>الإجمالي {CURRENCY_IN[inv.exchangeCurrency] ?? `بـ${inv.exchangeCurrency}`}</th>
                  <td>{formatMoney(Math.round(inv.total * rate * 100) / 100, inv.exchangeCurrency)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <SignBlock sign={settings.sign} assets={signFor(kind, settings, assets)} />
    </LetterheadSheet>
  );
}
