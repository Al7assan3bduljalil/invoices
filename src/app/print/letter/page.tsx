export const dynamic = "force-dynamic";

import { LetterheadSheet } from "@/components/letterhead/letterhead";
import { PrintToolbar } from "@/components/letterhead/print-toolbar";
import { LetterBody } from "./letter-body";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "خطاب رسمي" };

/** ورقة رسمية فارغة بترويسة الشركة لكتابة الخطابات وطباعتها */
export default function LetterPage() {
  return (
    <div className="lh-page">
      <PrintToolbar backHref="/" hint="اكتب مباشرة داخل الورقة ثم اطبع" />
      <LetterheadSheet>
        <LetterBody today={formatDate(new Date())} />
      </LetterheadSheet>
    </div>
  );
}
