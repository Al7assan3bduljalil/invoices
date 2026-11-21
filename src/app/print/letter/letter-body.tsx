"use client";
import { SignBlock } from "@/components/letterhead/sign-block";
import { signFor, type PrintSettings, type SignAssets } from "@/lib/print-settings";

/** نص الخطاب قابل للتحرير مباشرة داخل الورقة */
export function LetterBody({ today, settings, assets }: { today: string; settings: PrintSettings; assets: SignAssets }) {
  const editable = { contentEditable: true, suppressContentEditableWarning: true, spellCheck: false } as const;
  const T = settings.templates;

  return (
    <div className="lh-letter">
      <div className="lh-letter-meta">
        <div>التاريخ: <span {...editable}>{today}</span></div>
        <div>الإشاري: <span {...editable}>........</span></div>
      </div>
      <p className="lh-letter-to" {...editable}>السادة / ........................................ المحترمين</p>
      <p className="lh-letter-subject" {...editable}>الموضوع: ........................................</p>
      <p {...editable}>{T.letterGreeting || "\u00a0"}</p>
      <div className="lh-letter-body" {...editable}>
        اكتب نص الخطاب هنا...
      </div>
      <p {...editable}>{T.letterClosing || "\u00a0"}</p>
      <SignBlock
        sign={settings.sign}
        assets={signFor("letter", settings, assets)}
        signatory={T.defaultSignatory || "........"}
        editable
      />
    </div>
  );
}
