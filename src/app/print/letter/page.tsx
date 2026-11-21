export const dynamic = "force-dynamic";

import { LetterheadSheet } from "@/components/letterhead/letterhead";
import { PrintToolbar } from "@/components/letterhead/print-toolbar";
import { LetterBody } from "./letter-body";
import { formatDate } from "@/lib/utils";
import { getCurrentUser } from "@/server/current-user";
import { printContext } from "@/lib/print-settings";

export const metadata = { title: "خطاب رسمي" };

/** ورقة رسمية فارغة بترويسة الشركة لكتابة الخطابات وطباعتها */
export default async function LetterPage() {
  const { settings, assets } = printContext(await getCurrentUser());
  return (
    <div className="lh-page">
      <PrintToolbar backHref="/" hint="اكتب مباشرة داخل الورقة ثم اطبع" settingsHref />
      <LetterheadSheet letterhead={settings.letterhead}>
        <LetterBody today={formatDate(new Date())} settings={settings} assets={assets} />
      </LetterheadSheet>
    </div>
  );
}
