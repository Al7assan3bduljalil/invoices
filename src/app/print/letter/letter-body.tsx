"use client";

/** نص الخطاب قابل للتحرير مباشرة داخل الورقة */
export function LetterBody({ today }: { today: string }) {
  const editable = { contentEditable: true, suppressContentEditableWarning: true, spellCheck: false } as const;

  return (
    <div className="lh-letter">
      <div className="lh-letter-meta">
        <div>التاريخ: <span {...editable}>{today}</span></div>
        <div>الإشاري: <span {...editable}>........</span></div>
      </div>
      <p className="lh-letter-to" {...editable}>السادة / ........................................ المحترمين</p>
      <p className="lh-letter-subject" {...editable}>الموضوع: ........................................</p>
      <p {...editable}>تحية طيبة وبعد،</p>
      <div className="lh-letter-body" {...editable}>
        اكتب نص الخطاب هنا...
      </div>
      <p {...editable}>وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>
      <div className="lh-letter-sign">
        <div {...editable}>المدير العام</div>
        <div className="lh-sign-label">التوقيع والختم</div>
      </div>
    </div>
  );
}
