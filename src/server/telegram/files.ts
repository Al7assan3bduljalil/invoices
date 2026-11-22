/**
 * استخراج النص من الملفات المرسلة للبوت (Excel، Word، PowerPoint، CSV، TXT، JSON...)
 * بدون مكتبات خارجية: ملفات Office الحديثة (xlsx/docx/pptx) هي أرشيف ZIP بداخله XML،
 * فنقرأ الأرشيف بـ zlib المدمجة في Node ثم نحلل الـ XML.
 * ملفات PDF تُقرأ بواسطة Gemini (يفهم PDF مباشرة) في bot.ts.
 */
import { inflateRawSync } from "node:zlib";

export type FileKind = "text" | "csv" | "json" | "xlsx" | "docx" | "pptx" | "pdf" | "legacy-office" | "unsupported";

const TEXT_EXT = new Set(["txt", "text", "md", "markdown", "log", "xml", "html", "htm", "yaml", "yml", "ini"]);
const CSV_EXT = new Set(["csv", "tsv"]);

export function fileExtension(name?: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name ?? "");
  return m ? m[1].toLowerCase() : "";
}

/** تحديد نوع الملف من الامتداد أولاً ثم من نوع MIME */
export function detectKind(fileName?: string, mime?: string): FileKind {
  const ext = fileExtension(fileName);
  const m = (mime ?? "").toLowerCase();
  if (ext === "xlsx" || ext === "xlsm" || m.includes("spreadsheetml")) return "xlsx";
  if (ext === "docx" || m.includes("wordprocessingml")) return "docx";
  if (ext === "pptx" || m.includes("presentationml")) return "pptx";
  if (ext === "pdf" || m === "application/pdf") return "pdf";
  if (ext === "xls" || ext === "doc" || ext === "ppt" || m === "application/vnd.ms-excel" || m === "application/msword")
    return "legacy-office";
  if (CSV_EXT.has(ext) || m === "text/csv" || m === "text/tab-separated-values") return "csv";
  if (ext === "json" || m === "application/json") return "json";
  if (TEXT_EXT.has(ext) || m.startsWith("text/")) return "text";
  return "unsupported";
}

// ---------- نص عادي ----------

/** فك ترميز النص: UTF-8 (مع/بدون BOM) أو UTF-16، وإلا windows-1256 (ملفات CSV العربية من Excel القديم) */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("windows-1256").decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }
}

/** CSV/TSV: نوحّد الفاصل إلى " | " ليسهل على المساعد قراءة الأعمدة */
export function csvToText(raw: string): string {
  const firstLine = raw.split(/\r?\n/, 1)[0] ?? "";
  const counts: [string, number][] = [",", ";", "\t", "|"].map((d) => [d, firstLine.split(d).length - 1]);
  const delim = counts.sort((a, b) => b[1] - a[1])[0];
  if (!delim || delim[1] === 0) return raw.trim();
  const sep = delim[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quoted) {
      if (ch === '"' && raw[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && raw[i + 1] === "\n") i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows
    .filter((r) => r.some((c) => c))
    .map((r) => r.join(" | "))
    .join("\n");
}

export function jsonToText(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 1);
  } catch {
    return raw.trim();
  }
}

// ---------- قراءة أرشيف ZIP ----------

const MAX_UNZIPPED_BYTES = 50 * 1024 * 1024;

/** قارئ ZIP مبسّط (يدعم التخزين بدون ضغط وضغط deflate، وهما ما يستخدمه Office) */
export function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // سجل نهاية الدليل المركزي (EOCD) في آخر 64KB من الملف
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ليس ملف ZIP صالحاً");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map<string, Uint8Array>();
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("دليل ZIP تالف");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/")) continue;
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const data = buf.subarray(start, start + compSize);
    let out: Uint8Array;
    if (method === 0) out = data;
    else if (method === 8) out = inflateRawSync(data, { maxOutputLength: MAX_UNZIPPED_BYTES - total });
    else continue;
    total += out.length;
    if (total > MAX_UNZIPPED_BYTES) throw new Error("محتوى الملف كبير جداً بعد فك الضغط");
    files.set(name, out);
  }
  return files;
}

// ---------- أدوات XML ----------

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

const attr = (tag: string, name: string) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? decodeXml(m[1]) : undefined;
};

const utf8 = (b?: Uint8Array) => (b ? Buffer.from(b).toString("utf8") : "");

/** كل نصوص <t> داخل جزء XML (لعناصر النص المنسق في Excel) */
const joinT = (xml: string) =>
  [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([^<]*)<\/(?:\w+:)?t>/g)].map((m) => decodeXml(m[1])).join("");

// ---------- Excel (xlsx) ----------

function colIndex(ref: string) {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function xlsxToText(files: Map<string, Uint8Array>): string {
  const shared = [...utf8(files.get("xl/sharedStrings.xml")).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => joinT(m[1]));
  const rels = new Map<string, string>();
  for (const m of utf8(files.get("xl/_rels/workbook.xml.rels")).matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) rels.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
  }
  const sheets: { name: string; path: string }[] = [];
  for (const m of utf8(files.get("xl/workbook.xml")).matchAll(/<sheet\b[^>]*>/g)) {
    const rid = attr(m[0], "r:id");
    const path = rid ? rels.get(rid) : undefined;
    if (path) sheets.push({ name: attr(m[0], "name") ?? "", path });
  }
  if (!sheets.length)
    for (const k of [...files.keys()].filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort())
      sheets.push({ name: k.replace(/^.*\/|\.xml$/g, ""), path: k });

  const out: string[] = [];
  for (const sheet of sheets) {
    const xml = utf8(files.get(sheet.path));
    const lines: string[] = [];
    for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = [];
      for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const head = `<c${c[1]}>`;
        const body = c[2] ?? "";
        const type = attr(head, "t");
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        let val = "";
        if (type === "s") val = shared[Number(v)] ?? "";
        else if (type === "inlineStr") val = joinT(body);
        else if (type === "b") val = v === "1" ? "TRUE" : "FALSE";
        else if (v != null) val = decodeXml(v);
        const ref = attr(head, "r");
        const idx = ref ? colIndex(ref) : cells.length;
        while (cells.length < idx) cells.push("");
        cells[idx] = val.replace(/\s+/g, " ").trim();
      }
      if (cells.some((x) => x)) lines.push(cells.join(" | "));
    }
    if (lines.length) out.push(`### ورقة: ${sheet.name}\n${lines.join("\n")}`);
  }
  return out.join("\n\n");
}

// ---------- Word (docx) ----------

export function docxToText(files: Map<string, Uint8Array>): string {
  const xml = utf8(files.get("word/document.xml"));
  if (!xml) return "";
  let out = "";
  let cellDepth = 0;
  for (const m of xml.matchAll(
    /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>|<w:tc[\s>]|<\/w:tc>|<\/w:tr>|<\/w:p>/g,
  )) {
    const tok = m[0];
    if (m[1] !== undefined) out += decodeXml(m[1]);
    else if (tok === "<w:tab/>") out += "\t";
    else if (tok === "<w:br/>") out += cellDepth ? " " : "\n";
    else if (tok.startsWith("<w:tc")) cellDepth++;
    else if (tok === "</w:tc>") {
      cellDepth = Math.max(0, cellDepth - 1);
      out = out.replace(/ +$/, "") + " | ";
    } else if (tok === "</w:tr>") out = out.replace(/ \| $/, "") + "\n";
    else if (tok === "</w:p>") out += cellDepth ? " " : "\n";
  }
  return out
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------- PowerPoint (pptx) ----------

export function pptxToText(files: Map<string, Uint8Array>): string {
  const slides = [...files.keys()]
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)![1]) - Number(/(\d+)\.xml$/.exec(b)![1]));
  return slides
    .map((k, i) => {
      const paras = [...utf8(files.get(k)).matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)]
        .map((p) => joinT(p[1]).trim())
        .filter(Boolean);
      return paras.length ? `### شريحة ${i + 1}\n${paras.join("\n")}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

/** استخراج النص من ملف معروف النوع (ما عدا PDF الذي يُقرأ بالذكاء الاصطناعي) */
export function extractText(kind: FileKind, bytes: Uint8Array): string {
  switch (kind) {
    case "text":
      return decodeText(bytes).trim();
    case "csv":
      return csvToText(decodeText(bytes));
    case "json":
      return jsonToText(decodeText(bytes));
    case "xlsx":
      return xlsxToText(readZip(bytes));
    case "docx":
      return docxToText(readZip(bytes));
    case "pptx":
      return pptxToText(readZip(bytes));
    default:
      return "";
  }
}
