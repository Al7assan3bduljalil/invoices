import type { InvoiceDTO } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { DOCUMENT_LABELS, type DocumentKind } from "./brand";
import { LetterheadSheet } from "./letterhead";

interface Props {
  kind: DocumentKind;
  invoice: InvoiceDTO;
  stampUrl?: string | null;
  signatureUrl?: string | null;
}

/** قالب الفاتورة / عرض السعر على ترويسة الشركة */
export function LetterheadDocument({ kind, invoice: inv, stampUrl, signatureUrl }: Props) {
  const L = DOCUMENT_LABELS[kind];
  const money = (n: number) => formatMoney(n, inv.currency);

  return (
    <LetterheadSheet>
      <div className="lh-doc-head">
        <div>
          <h1 className="lh-doc-title">{L.title}</h1>
          {kind === "invoice" && inv.status === "PAID" && <span className="lh-paid">مدفوعة</span>}
        </div>
        <dl className="lh-meta">
          <div><dt>{L.number}</dt><dd dir="ltr">{inv.number}</dd></div>
          <div><dt>{L.date}</dt><dd>{formatDate(inv.issueDate)}</dd></div>
          <div><dt>{L.due}</dt><dd>{formatDate(inv.dueDate)}</dd></div>
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

      {kind === "quote" && (
        <p className="lh-intro">
          تحية طيبة وبعد، يسرّنا أن نتقدم لكم بعرض السعر التالي:
        </p>
      )}

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
          {kind === "quote" && (
            <p><strong>صلاحية العرض:</strong> هذا العرض ساري حتى {formatDate(inv.dueDate)}.</p>
          )}
          {inv.notes && (
            <>
              <p className="lh-notes-label">ملاحظات</p>
              <p className="lh-pre">{inv.notes}</p>
            </>
          )}
        </div>
        <table className="lh-totals">
          <tbody>
            <tr><th>المجموع الفرعي</th><td>{money(inv.subtotal)}</td></tr>
            {inv.discount > 0 && <tr><th>الخصم</th><td>- {money(inv.discount)}</td></tr>}
            {inv.taxRate > 0 && <tr><th>الضريبة ({inv.taxRate}%)</th><td>{money(inv.taxAmount)}</td></tr>}
            <tr className="lh-grand"><th>الإجمالي</th><td>{money(inv.total)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="lh-sign">
        <div>
          <div className="lh-sign-box">
            {signatureUrl && <img src={signatureUrl} alt="التوقيع" />}
          </div>
          <div className="lh-sign-label">التوقيع المعتمد</div>
        </div>
        <div>
          <div className="lh-sign-box">
            {stampUrl && <img src={stampUrl} alt="الختم" className="lh-stamp" />}
          </div>
          <div className="lh-sign-label">ختم الشركة</div>
        </div>
      </div>
    </LetterheadSheet>
  );
}
