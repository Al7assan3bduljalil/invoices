/**
 * تحويل markdown الذي يكتبه النموذج إلى HTML المدعوم في Telegram
 * (b, i, code, pre, a فقط). الجداول تتحول إلى أسطر نصية مقروءة.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** تحويل الروابط النسبية (/invoices/..) إلى روابط كاملة على موقع النظام */
export function absolutize(md: string, baseUrl: string) {
  const base = baseUrl.replace(/\/+$/, "");
  return md.replace(/\]\((\/[^)\s]*)\)/g, (_, path) => `](${base}${path})`);
}

function inline(line: string) {
  // احجز مقاطع الكود أولاً حتى لا تُعالج بداخلها رموز التنسيق
  const codes: string[] = [];
  let s = line.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${esc(c)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  const links: string[] = [];
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, t, u) => {
    links.push(`<a href="${esc(u)}">${esc(t)}</a>`);
    return `\u0001${links.length - 1}\u0001`;
  });
  s = esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/__([^_]+)__/g, "<b>$1</b>")
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,:؛،]|$)/g, "$1<i>$2</i>");
  return s
    .replace(/\u0001(\d+)\u0001/g, (_, i) => links[Number(i)])
    .replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

export function markdownToTelegramHtml(md: string) {
  const out: string[] = [];
  let inPre = false;
  let pre: string[] = [];
  for (const raw of md.replace(/\r/g, "").split("\n")) {
    if (/^\s*```/.test(raw)) {
      if (inPre) {
        out.push(`<pre>${esc(pre.join("\n"))}</pre>`);
        pre = [];
      }
      inPre = !inPre;
      continue;
    }
    if (inPre) {
      pre.push(raw);
      continue;
    }
    // فاصل جدول markdown مثل |---|---|
    if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(raw)) continue;
    // صف جدول → عناصر مفصولة بـ " | "
    if (/^\s*\|.*\|\s*$/.test(raw)) {
      const cells = raw.trim().slice(1, -1).split("|").map((c) => c.trim());
      out.push(inline(cells.join(" | ")));
      continue;
    }
    const h = raw.match(/^\s*#{1,6}\s+(.*)$/);
    if (h) {
      out.push(`<b>${inline(h[1].replace(/\*\*/g, ""))}</b>`);
      continue;
    }
    const li = raw.match(/^(\s*)[-*+]\s+(.*)$/);
    if (li) {
      out.push(`${li[1]}• ${inline(li[2])}`);
      continue;
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(raw)) {
      out.push("────────");
      continue;
    }
    out.push(inline(raw));
  }
  if (inPre && pre.length) out.push(`<pre>${esc(pre.join("\n"))}</pre>`);
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
