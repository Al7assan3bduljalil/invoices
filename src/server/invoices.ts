import { Prisma, type InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcTotals } from "@/lib/calc";
import { AUTO_ARCHIVE_STATUSES } from "@/lib/invoice-status";
import { HttpError } from "./http";
import { serializeInvoice } from "./serialize";
import type { InvoiceInput } from "./validation";

export const invoiceInclude = {
  client: true,
  items: { orderBy: { position: "asc" } },
} satisfies Prisma.InvoiceInclude;

/** تحويل الفواتير المُرسلة التي تجاوزت تاريخ الاستحقاق إلى "متأخرة" */
export async function refreshOverdue(userId: string) {
  await prisma.invoice.updateMany({
    where: { userId, status: "SENT", dueDate: { lt: startOfToday() } },
    data: { status: "OVERDUE" },
  });
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildItems(input: InvoiceInput) {
  const totals = calcTotals(input.items, input.taxRate, input.discount);
  const items = input.items.map((it, idx) => ({
    productId: it.productId || null,
    description: it.description,
    unit: it.unit || "وحدة",
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineTotal: totals.lines[idx],
    position: idx,
  }));
  return { totals, items };
}

/** حقول الحالة والأرشفة الناتجة عن تغيير الحالة */
function statusSideEffects(
  status: InvoiceStatus,
  previous?: { status: InvoiceStatus; paidAt: Date | null; archivedAt: Date | null },
) {
  const changed = !previous || previous.status !== status;
  const data: { paidAt?: Date | null; archivedAt?: Date | null } = {};
  if (status === "PAID") data.paidAt = previous?.paidAt ?? new Date();
  else if (changed) data.paidAt = null;
  // الأرشفة التلقائية: عند الدفع أو الإلغاء تنتقل الفاتورة إلى الأرشيف
  if (changed && AUTO_ARCHIVE_STATUSES.includes(status)) {
    data.archivedAt = previous?.archivedAt ?? new Date();
  }
  return data;
}

export async function listInvoices(
  userId: string,
  opts: { archived?: boolean; status?: InvoiceStatus; clientId?: string; q?: string } = {},
) {
  await refreshOverdue(userId);
  const where: Prisma.InvoiceWhereInput = {
    userId,
    archivedAt: opts.archived ? { not: null } : null,
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.clientId ? { clientId: opts.clientId } : {}),
    ...(opts.q
      ? {
          OR: [
            { number: { contains: opts.q, mode: "insensitive" } },
            { client: { name: { contains: opts.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const rows = await prisma.invoice.findMany({
    where,
    include: invoiceInclude,
    orderBy: opts.archived ? { archivedAt: "desc" } : { issueDate: "desc" },
  });
  return rows.map(serializeInvoice);
}

export async function getInvoice(userId: string, id: string) {
  await refreshOverdue(userId);
  const inv = await prisma.invoice.findFirst({ where: { id, userId }, include: invoiceInclude });
  if (!inv) throw new HttpError(404, "الفاتورة غير موجودة");
  return serializeInvoice(inv);
}

export async function createInvoice(
  userId: string,
  input: InvoiceInput,
  opts: { createdByAI?: boolean } = {},
) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, userId } });
  if (!client) throw new HttpError(400, "العميل غير موجود");
  if (input.dueDate < input.issueDate)
    throw new HttpError(400, "تاريخ الاستحقاق يجب أن يكون بعد تاريخ الإصدار");

  const { totals, items } = buildItems(input);

  const inv = await prisma.$transaction(async (tx) => {
    // ترقيم تلقائي آمن: زيادة العداد ذرياً داخل المعاملة
    const user = await tx.user.update({
      where: { id: userId },
      data: { nextInvoiceNumber: { increment: 1 } },
    });
    const seq = user.nextInvoiceNumber - 1;
    const number = `${user.invoicePrefix}-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;
    return tx.invoice.create({
      data: {
        userId,
        clientId: input.clientId,
        number,
        status: input.status,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        currency: input.currency,
        taxRate: input.taxRate,
        discount: totals.discount,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        notes: input.notes,
        createdByAI: opts.createdByAI ?? false,
        ...statusSideEffects(input.status),
        items: { create: items },
      },
      include: invoiceInclude,
    });
  });
  return serializeInvoice(inv);
}

export async function updateInvoice(userId: string, id: string, input: InvoiceInput) {
  const existing = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "الفاتورة غير موجودة");
  const client = await prisma.client.findFirst({ where: { id: input.clientId, userId } });
  if (!client) throw new HttpError(400, "العميل غير موجود");
  if (input.dueDate < input.issueDate)
    throw new HttpError(400, "تاريخ الاستحقاق يجب أن يكون بعد تاريخ الإصدار");

  const { totals, items } = buildItems(input);
  const inv = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        clientId: input.clientId,
        status: input.status,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        currency: input.currency,
        taxRate: input.taxRate,
        discount: totals.discount,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        notes: input.notes,
        ...statusSideEffects(input.status, existing),
        items: { create: items },
      },
      include: invoiceInclude,
    });
  });
  return serializeInvoice(inv);
}

export async function setInvoiceStatus(userId: string, id: string, status: InvoiceStatus) {
  const existing = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "الفاتورة غير موجودة");
  const inv = await prisma.invoice.update({
    where: { id },
    data: { status, ...statusSideEffects(status, existing) },
    include: invoiceInclude,
  });
  return serializeInvoice(inv);
}

/** أرشفة يدوية أو استرجاع من الأرشيف */
export async function setArchived(userId: string, id: string, archived: boolean) {
  const existing = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "الفاتورة غير موجودة");
  const inv = await prisma.invoice.update({
    where: { id },
    data: { archivedAt: archived ? (existing.archivedAt ?? new Date()) : null },
    include: invoiceInclude,
  });
  return serializeInvoice(inv);
}

export async function deleteInvoice(userId: string, id: string) {
  const existing = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!existing) throw new HttpError(404, "الفاتورة غير موجودة");
  await prisma.invoice.delete({ where: { id } });
  return { ok: true };
}
