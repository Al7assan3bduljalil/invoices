export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/server/current-user";
import { getLetter } from "@/server/letters";
import { LetterheadSheet } from "@/components/letterhead/letterhead";
import { PrintToolbar } from "@/components/letterhead/print-toolbar";
import { formatDate } from "@/lib/utils";
import { printContext, signFor } from "@/lib/print-settings";
import { SignBlock } from "@/components/letterhead/sign-block";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const user = await getCurrentUser();
  const letter = await getLetter(user.id, (await params).id).catch(() => null);
  return { title: letter ? `خطاب ${letter.number}` : "خطاب" };
}

/** طباعة خطاب صادر محفوظ على ترويسة الشركة */
export default async function PrintLetterPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  const letter = await getLetter(user.id, id).catch(() => null);
  if (!letter) notFound();
  const { settings, assets } = printContext(user);
  const T = settings.templates;

  return (
    <div className="lh-page">
      <PrintToolbar backHref={`/letters/${id}`} hint="اختر الورق A4 وفعّل «رسومات الخلفية» في نافذة الطباعة" settingsHref />
      <LetterheadSheet letterhead={settings.letterhead}>
        <div className="lh-letter">
          <div className="lh-letter-meta">
            <div>التاريخ: {formatDate(letter.date)}</div>
            <div>الإشاري: <bdi>{letter.number}</bdi></div>
          </div>
          <p className="lh-letter-to">
            السادة / {letter.party}{letter.partyTitle ? ` ${letter.partyTitle}` : ""}
          </p>
          <p className="lh-letter-subject">الموضوع: {letter.subject}</p>
          {T.letterGreeting && <p>{T.letterGreeting}</p>}
          <div className="lh-letter-body lh-letter-body-saved">{letter.body}</div>
          {T.letterClosing && <p>{T.letterClosing}</p>}
          <SignBlock
            sign={settings.sign}
            assets={signFor("letter", settings, assets)}
            signatory={letter.signatory || T.defaultSignatory}
          />
          {letter.cc && (
            <div className="lh-letter-cc">
              <strong>نسخة إلى:</strong> {letter.cc}
            </div>
          )}
        </div>
      </LetterheadSheet>
    </div>
  );
}
