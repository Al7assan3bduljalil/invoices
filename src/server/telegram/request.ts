import { timingSafeEqual } from "node:crypto";

/** مقارنة آمنة زمنياً للسر */
export function secretMatches(given: string | null | undefined) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** أصل الموقع العام (خلف البروكسي) لبناء الروابط الكاملة */
export function requestOrigin(req: Request) {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? "https";
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}
