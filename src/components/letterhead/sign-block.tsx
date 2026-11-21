/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import type { PrintSettings, SignAssets } from "@/lib/print-settings";

interface Props {
  sign: PrintSettings["sign"];
  assets: SignAssets;
  /** اسم/صفة الموقّع فوق التوقيع (في الخطابات) */
  signatory?: string | null;
  /** السماح بتعديل اسم الموقّع مباشرة في الورقة */
  editable?: boolean;
}

/** عنوان الخانة الموحدة (القيمة القديمة «التوقيع المعتمد» تُعرض بالعنوان الافتراضي الجديد) */
export function signLabel(sign: PrintSettings["sign"]) {
  const l = sign.signatureLabel.trim();
  return !l || l === "التوقيع المعتمد" ? "التوقيع المعتمد وختم الشركة" : l;
}

/**
 * خانة واحدة للتوقيع والختم في أسفل المستند: الختم فوق التوقيع.
 * الحجم والموضع والإمالة تأتي من إعدادات الطباعة.
 */
export function SignBlock({ sign, assets, signatory, editable }: Props) {
  const edit = editable ? { contentEditable: true, suppressContentEditableWarning: true, spellCheck: false } as const : {};
  const { signatureUrl, stampUrl } = assets;
  const name = signatory || sign.signatoryName;
  const sigStyle: CSSProperties = { height: `${sign.signatureSize}mm` };
  const stampStyle: CSSProperties = {
    width: `${sign.stampSize}mm`,
    height: `${sign.stampSize}mm`,
    transform: sign.stampRotation ? `rotate(${sign.stampRotation}deg)` : undefined,
  };
  const boxHeight = `${Math.max(sign.signatureSize, sign.stampSize * 0.85) + 2}mm`;

  return (
    <div className={`lh-signblock lh-pos-${sign.position}`}>
      <div className="lh-signcell">
        {name && <div className="lh-signatory" {...edit}>{name}</div>}
        <div className="lh-signstack" style={{ height: boxHeight }}>
          {signatureUrl && <img src={signatureUrl} alt="التوقيع" className="lh-sig-img" style={sigStyle} />}
          {stampUrl && (
            <img
              src={stampUrl}
              alt="الختم"
              className={signatureUrl ? "lh-stamp-img lh-stamp-over" : "lh-stamp-img"}
              style={stampStyle}
            />
          )}
        </div>
        <div className="lh-sign-label">{signLabel(sign)}</div>
      </div>
    </div>
  );
}
