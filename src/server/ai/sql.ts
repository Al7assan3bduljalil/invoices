import { prisma } from "@/lib/prisma";

const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|comment|call|do|execute|prepare|listen|notify|set|reset|lock|pg_sleep|pg_read|lo_import|lo_export|dblink)\b/i;

/**
 * تنفيذ استعلام SQL للقراءة فقط (Text-to-SQL) بأمان:
 * - يُسمح فقط بـ SELECT / WITH وبجملة واحدة
 * - يُنفذ داخل معاملة READ ONLY مع مهلة زمنية
 * - يُشترط تقييد النتائج بمعرّف المستخدم الحالي
 */
export async function runReadOnlySql(userId: string, sql: string) {
  const cleaned = sql.trim().replace(/;+\s*$/, "");
  if (!/^(select|with)\b/i.test(cleaned)) throw new Error("يُسمح فقط باستعلامات SELECT");
  if (cleaned.includes(";")) throw new Error("يُسمح بجملة واحدة فقط");
  if (/--|\/\*/.test(cleaned)) throw new Error("التعليقات غير مسموحة في الاستعلام");
  if (FORBIDDEN.test(cleaned)) throw new Error("الاستعلام يحتوي على أوامر غير مسموحة");
  if (!cleaned.includes(userId))
    throw new Error(`يجب تقييد الاستعلام بالمستخدم الحالي: "userId" = '${userId}'`);

  const rows = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = 5000");
    return tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM (${cleaned}) AS q LIMIT 200`);
  });
  // تحويل القيم غير القابلة للتسلسل (BigInt / Decimal / Date)
  return JSON.parse(
    JSON.stringify(rows, (_, v) =>
      typeof v === "bigint" ? Number(v) : v && typeof v === "object" && "toFixed" in v ? Number(v) : v,
    ),
  ) as Record<string, unknown>[];
}

export const DB_SCHEMA_DOC = `
جداول PostgreSQL (أسماء الأعمدة camelCase ويجب وضعها بين علامات تنصيص مزدوجة):
- "User"(id, name, email, "companyName", currency, "defaultTaxRate")
- "Client"(id, "userId", name, email, phone, address, "taxNumber", "createdAt")
- "Product"(id, "userId", name, description, unit, price, "taxRate", "isActive")
- "Invoice"(id, "userId", "clientId", number, status, "issueDate", "dueDate", currency, "taxRate", discount, subtotal, "taxAmount", total, "paidAt", "archivedAt", "createdByAI", "createdAt")
   status ∈ ('DRAFT','SENT','PAID','OVERDUE','CANCELLED'). "archivedAt" IS NOT NULL تعني أن الفاتورة في الأرشيف.
- "InvoiceItem"(id, "invoiceId", "productId", description, unit, quantity, "unitPrice", "lineTotal")
`;
