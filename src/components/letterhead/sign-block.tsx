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

/**
 * كتلة التوقيع والختم في أسفل المستند.
 * الحجم والموضع والتداخل تأتي من إعدادات الطباعة.
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
  const boxHeight = `${Math.max(sign.signatureSize, sign.stampSize * (sign.overlap ? 0.8 : 1)) + 2}mm`;

  if (sign.overlap) {
    // الختم فوق التوقيع في كتلة واحدة
    return (
      <div className={`lh-signblock lh-pos-${sign.position}`}>
        <div className="lh-signcell">
          {name && <div className="lh-signatory" {...edit}>{name}</div>}
          <div className="lh-signstack" style={{ height: boxHeight }}>
            {signatureUrl && <img src={signatureUrl} alt="التوقيع" className="lh-sig-img" style={sigStyle} />}
            {stampUrl && <img src={stampUrl} alt="الختم" className="lh-stamp-img lh-stamp-over" style={stampStyle} />}
          </div>
          <div className="lh-sign-label">
            {sign.signatureLabel && sign.stampLabel
              ? `${sign.signatureLabel} و${sign.stampLabel}`
              : sign.signatureLabel || sign.stampLabel || "التوقيع والختم"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`lh-signblock lh-pos-${sign.position} lh-split`}>
      <div className="lh-signcell">
        {name && <div className="lh-signatory" {...edit}>{name}</div>}
        <div className="lh-signbox" style={{ height: boxHeight }}>
          {signatureUrl && <img src={signatureUrl} alt="التوقيع" className="lh-sig-img" style={sigStyle} />}
        </div>
        <div className="lh-sign-label">{sign.signatureLabel || "التوقيع"}</div>
      </div>
      <div className="lh-signcell">
        {name && <div className="lh-signatory lh-signatory-ghost" aria-hidden="true">{name}</div>}
        <div className="lh-signbox" style={{ height: boxHeight }}>
          {stampUrl && <img src={stampUrl} alt="الختم" className="lh-stamp-img" style={stampStyle} />}
        </div>
        <div className="lh-sign-label">{sign.stampLabel || "الختم"}</div>
      </div>
    </div>
  );
}
