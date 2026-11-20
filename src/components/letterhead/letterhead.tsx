import type { ReactNode } from "react";
import { Globe, MapPin, Phone } from "lucide-react";
import { BRAND } from "./brand";

/*
 * ترويسة الشركة المعتمدة (شموع المدينة).
 * كل العناصر مرسومة كـ SVG متجه لتبقى حادة عند الطباعة وحفظ PDF.
 * الأبعاد بالمليمتر لصفحة A4 (210×297).
 */

/** شعار الشركة (الرمز فقط) */
export function LogoMark({ color = BRAND.colors.green, className, style }: {
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 386 324" className={className} style={style} aria-hidden="true">
      <g fill={color}>
        <path d="M78 2 154 78 78 154 2 78Z" />
        <path d="M160 88 234 162 75 321 1 247Z" />
        <path d="M244.85 77.15 319.1 2.9A225 225 0 0 1 319.1 321.1L244.85 246.85A120 120 0 0 0 244.85 77.15Z" />
      </g>
    </svg>
  );
}

/** الشعار مع اسم الشركة */
export function BrandLogo() {
  return (
    <div className="lh-logo">
      <LogoMark className="lh-logo-mark" />
      <div className="lh-logo-text">
        <div className="lh-logo-name">{BRAND.name}</div>
        <div className="lh-logo-tagline">{BRAND.tagline}</div>
      </div>
    </div>
  );
}

// وحدة الزخرفة في الشريط العلوي: عرض 115.5 × ارتفاع 72
const HEADER_TILE =
  "M-0.45 13.45L13.25-0.25 42.95 29.45 29.25 43.15Z" +
  "M30.95 14.45L44.95 0.45 58.45 13.95 44.45 27.95Z" +
  "M74.95 41.95L87.95 28.95 116.45 57.45 103.45 70.45Z" +
  "M58.95 57.45L73.45 42.95 86.95 56.45 72.45 70.95Z" +
  "M44.91 43.91L57.99 56.99A41 41 0 0 1 0.01 56.99L13.09 43.91A22.5 22.5 0 0 0 44.91 43.91Z" +
  "M70.84 27.09L57.76 14.01A41 41 0 0 1 115.74 14.01L102.66 27.09A22.5 22.5 0 0 0 70.84 27.09Z";

/** الشريط الأخضر المزخرف أعلى الصفحة */
export function HeaderPattern() {
  return (
    <svg className="lh-header-strip" viewBox="0 0 770 72" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <defs>
        <pattern id="lh-header-tile" width="115.5" height="72" patternUnits="userSpaceOnUse">
          <rect width="115.5" height="72" fill={BRAND.colors.green} />
          <g fill={BRAND.colors.dark}>
            <path d={HEADER_TILE} />
            <path d={HEADER_TILE} transform="translate(-115.5 0)" />
            <path d={HEADER_TILE} transform="translate(115.5 0)" />
          </g>
        </pattern>
      </defs>
      <rect width="770" height="72" fill="url(#lh-header-tile)" />
    </svg>
  );
}

// وحدة زخرفة التذييل (ربع دائرة + مستطيل + مربع) حول مركز (0,0)
const FOOTER_MOTIF =
  "M-28 0L-54.5 0A54.5 54.5 0 0 1 0-54.5L0-28A28 28 0 0 0-28 0Z" +
  "M-13-14h56v27h-56Z" +
  "M-13 14h26v28h-26Z";
const FW = 223.5;
const FH = 109.5;
const FOOTER_PLACEMENTS = [[95, 64.5], [206.75, 9.5]].flatMap(([x, y]) =>
  [-FW, 0, FW].flatMap((dx) => [-FH, 0, FH].map((dy) => [x + dx, y + dy])),
);

/** الزخرفة الباهتة في أسفل الصفحة */
export function FooterPattern() {
  return (
    <svg className="lh-footer-pattern" viewBox="0 0 1080 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <pattern id="lh-footer-tile" width={FW} height={FH} patternUnits="userSpaceOnUse">
          {FOOTER_PLACEMENTS.map(([x, y]) => (
            <path key={`${x}-${y}`} d={FOOTER_MOTIF} fill={BRAND.colors.pale} transform={`translate(${x} ${y})`} />
          ))}
        </pattern>
        {/* تدرّج أبيض يخفّف الزخرفة نحو الأعلى */}
        <linearGradient id="lh-footer-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1080" height="260" fill="url(#lh-footer-tile)" />
      <rect width="1080" height="260" fill="url(#lh-footer-fade)" />
    </svg>
  );
}

function ContactLine({ icon, children, ltr }: { icon: ReactNode; children: ReactNode; ltr?: boolean }) {
  return (
    <div className="lh-contact-line">
      <span className="lh-contact-icon">{icon}</span>
      <span dir={ltr ? "ltr" : undefined}>{children}</span>
    </div>
  );
}

/** بيانات التواصل في التذييل */
export function ContactBlock() {
  return (
    <div className="lh-contact">
      <ContactLine icon={<Phone strokeWidth={2.4} />} ltr>{BRAND.phone}</ContactLine>
      <ContactLine icon={<MapPin strokeWidth={2.4} />}>{BRAND.address}</ContactLine>
      <ContactLine icon={<Globe strokeWidth={2.4} />} ltr>{BRAND.website}</ContactLine>
    </div>
  );
}

/**
 * ورقة A4 بترويسة الشركة. يوضع المحتوى في children.
 * عند الطباعة تتكرر الترويسة والتذييل والعلامة المائية في كل صفحة.
 */
export function LetterheadSheet({ children }: { children: ReactNode }) {
  return (
    <div className="lh-sheet" dir="rtl">
      <div className="lh-header lh-fixed" aria-hidden="true">
        <HeaderPattern />
        <BrandLogo />
      </div>
      <div className="lh-watermark lh-fixed" aria-hidden="true">
        <LogoMark color={BRAND.colors.pale} />
      </div>
      <div className="lh-footer lh-fixed">
        <FooterPattern />
        <ContactBlock />
      </div>

      {/* الجدول يحجز مساحة الترويسة والتذييل في كل صفحة مطبوعة */}
      <table className="lh-flow">
        <thead><tr><td><div className="lh-space-top" /></td></tr></thead>
        <tbody><tr><td><div className="lh-content">{children}</div></td></tr></tbody>
        <tfoot><tr><td><div className="lh-space-bottom" /></td></tr></tfoot>
      </table>
    </div>
  );
}
