import { tool } from "ai";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { INVOICE_STATUSES, STATUS_LABELS } from "@/lib/invoice-status";
import {
  createInvoice,
  listInvoices,
  refreshOverdue,
  setArchived,
  setInvoiceStatus,
} from "../invoices";
import { serializeClient, serializeProduct } from "../serialize";
import { reminderContext } from "./reminder";
import { DB_SCHEMA_DOC, runReadOnlySql } from "./sql";

const dateRange = {
  from: z.string().optional().describe("تاريخ البداية بصيغة YYYY-MM-DD"),
  to: z.string().optional().describe("تاريخ النهاية بصيغة YYYY-MM-DD (شامل)"),
};

function rangeFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const f: Prisma.DateTimeFilter = {};
  if (from) f.gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    f.lte = end;
  }
  return f;
}

/** البحث عن عميل بالاسم (تطابق جزئي) */
async function findClients(userId: string, query: string) {
  const words = query.trim().split(/\s+/).filter((w) => w.length > 1);
  return prisma.client.findMany({
    where: {
      userId,
      OR: [
        { name: { contains: query.trim(), mode: "insensitive" } },
        ...(words.length > 1
          ? [{ AND: words.map((w) => ({ name: { contains: w, mode: "insensitive" as const } })) }]
          : []),
      ],
    },
    take: 10,
  });
}

/**
 * البحث في الكتالوج بالاسم والوصف: أولاً العبارة كاملة، ثم كل الكلمات معاً، ثم أي كلمة.
 * يتجاهل "ال" التعريف في بداية الكلمات ليتطابق "الكابل" مع "كابل".
 */
async function findProducts(userId: string, query?: string) {
  const base = { userId, isActive: true };
  const q = query?.trim();
  if (!q) return prisma.product.findMany({ where: base, take: 100, orderBy: { name: "asc" } });

  const field = (w: string) => [
    { name: { contains: w, mode: "insensitive" as const } },
    { description: { contains: w, mode: "insensitive" as const } },
  ];
  const words = [
    ...new Set(
      q
        .split(/[\s،,/\-]+/)
        .map((w) => w.replace(/^(وال|بال|لل|ال)(?=\S{2,})/, ""))
        .filter((w) => w.length > 1),
    ),
  ];
  const attempts = [
    { OR: field(q) },
    ...(words.length > 1 ? [{ AND: words.map((w) => ({ OR: field(w) })) }] : []),
    ...(words.length ? [{ OR: words.flatMap(field) }] : []),
  ];
  for (const cond of attempts) {
    const rows = await prisma.product.findMany({
      where: { ...base, ...cond },
      take: 30,
      orderBy: { name: "asc" },
    });
    if (rows.length) return rows;
  }
  return [];
}

const brief = (i: Awaited<ReturnType<typeof listInvoices>>[number]) => ({
  id: i.id,
  number: i.number,
  client: i.client.name,
  status: STATUS_LABELS[i.status],
  total: i.total,
  currency: i.currency,
  issueDate: i.issueDate.slice(0, 10),
  dueDate: i.dueDate.slice(0, 10),
  archived: i.archivedAt != null,
  url: `/invoices/${i.id}`,
});

export function buildTools(userId: string) {
  return {
    searchClients: tool({
      description: "البحث عن العملاء بالاسم. استخدمها دائماً قبل إنشاء فاتورة للتأكد من وجود العميل.",
      inputSchema: z.object({ query: z.string().describe("اسم العميل أو جزء منه") }),
      execute: async ({ query }) => (await findClients(userId, query)).map(serializeClient),
    }),

    createClient: tool({
      description: "إضافة عميل جديد. استخدمها فقط إذا لم يُعثر على العميل عبر searchClients.",
      inputSchema: z.object({
        name: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        taxNumber: z.string().optional(),
      }),
      execute: async (data) =>
        serializeClient(await prisma.client.create({ data: { ...data, userId } })),
    }),

    searchProducts: tool({
      description:
        "البحث في كتالوج المنتجات والخدمات وأسعارها (بالاسم والوصف، وتطابق جزئي بالكلمات). " +
        "استخدمها لمطابقة البنود التي يصفها المستخدم مع الكتالوج والحصول على السعر الرسمي. " +
        "إن لم تجد نتيجة فجرّب كلمة مفتاحية أقصر أو مرادفاً، أو اترك query فارغاً لعرض الكتالوج كاملاً.",
      inputSchema: z.object({
        query: z.string().optional().describe("اسم المنتج أو وصفه أو كلمات منه، اتركه فارغاً لعرض الكل"),
      }),
      execute: async ({ query }) => (await findProducts(userId, query)).map(serializeProduct),
    }),

    createProduct: tool({
      description:
        "إضافة صنف (منتج أو خدمة) جديد إلى الكتالوج. استخدمها فقط بعد التأكد عبر searchProducts أن الصنف غير موجود، " +
        "وبعد أن يحدد المستخدم السعر أو يوافق عليه. لا تخترع سعراً أبداً.",
      inputSchema: z.object({
        name: z.string().min(1).describe("اسم الصنف واضحاً ومختصراً كما يُعرض في الفاتورة"),
        price: z.number().min(0).describe("سعر الوحدة"),
        unit: z.string().optional().describe("وحدة القياس مثل: قطعة، متر، كرتونة، ساعة، خدمة"),
        description: z.string().optional().describe("وصف إضافي أو مواصفات"),
        taxRate: z.number().min(0).max(100).optional().describe("نسبة ضريبة خاصة بالصنف إن وُجدت"),
      }),
      execute: async ({ name, price, unit, description, taxRate }) => {
        const existing = await prisma.product.findFirst({
          where: { userId, isActive: true, name: { equals: name.trim(), mode: "insensitive" } },
        });
        if (existing)
          return { error: "يوجد صنف بنفس الاسم في الكتالوج", product: serializeProduct(existing) };
        const p = await prisma.product.create({
          data: {
            userId,
            name: name.trim(),
            price,
            unit: unit?.trim() || "وحدة",
            description: description?.trim() || null,
            taxRate: taxRate ?? null,
          },
        });
        return { created: true, product: serializeProduct(p) };
      },
    }),

    createInvoice: tool({
      description:
        "إنشاء فاتورة (أو عرض سعر كمسودة) لعميل موجود. إذا كان البند من الكتالوج مرّر productId ويمكن ترك unitPrice ليُؤخذ السعر من الكتالوج.",
      inputSchema: z.object({
        clientId: z.string().describe("معرّف العميل من searchClients أو createClient"),
        items: z
          .array(
            z.object({
              productId: z.string().optional(),
              description: z.string().describe("وصف البند"),
              quantity: z.number().positive().default(1),
              unitPrice: z.number().min(0).optional().describe("سعر الوحدة"),
              unit: z.string().optional(),
            }),
          )
          .min(1),
        currency: z.string().length(3).optional().describe("رمز العملة مثل USD أو SAR"),
        taxRate: z.number().min(0).max(100).optional().describe("نسبة الضريبة %، الافتراضي من إعدادات التاجر"),
        discount: z.number().min(0).optional().describe("قيمة الخصم"),
        dueInDays: z.number().int().min(0).default(30),
        status: z.enum(["DRAFT", "SENT"]).default("DRAFT"),
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const productIds = input.items.map((i) => i.productId).filter(Boolean) as string[];
        const products = productIds.length
          ? await prisma.product.findMany({ where: { userId, id: { in: productIds } } })
          : [];
        const items = input.items.map((i) => {
          const p = products.find((x) => x.id === i.productId);
          const unitPrice = i.unitPrice ?? (p ? Number(p.price) : undefined);
          if (unitPrice == null) throw new Error(`لم يُحدد سعر للبند: ${i.description}`);
          return {
            productId: p?.id ?? null,
            description: i.description || p?.name || "بند",
            unit: i.unit ?? p?.unit ?? "وحدة",
            quantity: i.quantity,
            unitPrice,
          };
        });
        const issueDate = new Date();
        const dueDate = new Date(issueDate.getTime() + input.dueInDays * 86400000);
        const inv = await createInvoice(
          userId,
          {
            clientId: input.clientId,
            status: input.status,
            issueDate,
            dueDate,
            currency: input.currency ?? user.currency,
            taxRate: input.taxRate ?? Number(user.defaultTaxRate),
            discount: input.discount ?? 0,
            notes: input.notes ?? null,
            items,
          },
          { createdByAI: true },
        );
        return {
          ...brief(inv),
          publicUrl: `/inv/${inv.shareToken}`,
          subtotal: inv.subtotal,
          taxAmount: inv.taxAmount,
          items: inv.items,
        };
      },
    }),

    listInvoices: tool({
      description:
        "عرض الفواتير مع إمكانية التصفية بالحالة أو العميل أو الفترة. scope=archived لعرض الأرشيف، active للفواتير النشطة، all للكل.",
      inputSchema: z.object({
        scope: z.enum(["active", "archived", "all"]).default("active"),
        status: z.enum(INVOICE_STATUSES).optional(),
        clientName: z.string().optional(),
        ...dateRange,
        limit: z.number().int().min(1).max(100).default(20),
      }),
      execute: async ({ scope, status, clientName, from, to, limit }) => {
        await refreshOverdue(userId);
        const range = rangeFilter(from, to);
        const rows = await prisma.invoice.findMany({
          where: {
            userId,
            ...(scope === "active" ? { archivedAt: null } : {}),
            ...(scope === "archived" ? { archivedAt: { not: null } } : {}),
            ...(status ? { status } : {}),
            ...(clientName
              ? { client: { name: { contains: clientName, mode: "insensitive" as const } } }
              : {}),
            ...(range ? { issueDate: range } : {}),
          },
          include: { client: true },
          orderBy: { issueDate: "desc" },
          take: limit,
        });
        return rows.map((i) => ({
          id: i.id,
          number: i.number,
          client: i.client.name,
          status: STATUS_LABELS[i.status],
          total: Number(i.total),
          currency: i.currency,
          issueDate: i.issueDate.toISOString().slice(0, 10),
          dueDate: i.dueDate.toISOString().slice(0, 10),
          archived: i.archivedAt != null,
          archivedAt: i.archivedAt?.toISOString().slice(0, 10) ?? null,
          url: `/invoices/${i.id}`,
        }));
      },
    }),

    financialSummary: tool({
      description:
        "ملخص مالي لفترة: إجمالي المبيعات، المدفوع، المعلق، المتأخر، عدد الفواتير، وأكثر العملاء شراءً. يشمل الفواتير المؤرشفة.",
      inputSchema: z.object({
        ...dateRange,
        topClientsLimit: z.number().int().min(1).max(20).default(5),
      }),
      execute: async ({ from, to, topClientsLimit }) => {
        await refreshOverdue(userId);
        const range = rangeFilter(from, to);
        const where: Prisma.InvoiceWhereInput = { userId, ...(range ? { issueDate: range } : {}) };
        const [byStatus, top] = await Promise.all([
          prisma.invoice.groupBy({
            by: ["status"],
            where,
            _sum: { total: true },
            _count: { _all: true },
          }),
          prisma.invoice.groupBy({
            by: ["clientId"],
            where: { ...where, status: { not: "CANCELLED" } },
            _sum: { total: true },
            _count: { _all: true },
            orderBy: { _sum: { total: "desc" } },
            take: topClientsLimit,
          }),
        ]);
        const clients = await prisma.client.findMany({
          where: { id: { in: top.map((t) => t.clientId) } },
        });
        const s = (st: string) => byStatus.find((b) => b.status === st);
        const v = (st: string) => Number(s(st)?._sum.total ?? 0);
        return {
          period: { from: from ?? "البداية", to: to ?? "اليوم" },
          totalSales: v("PAID") + v("SENT") + v("OVERDUE"),
          paid: { total: v("PAID"), count: s("PAID")?._count._all ?? 0 },
          pending: { total: v("SENT"), count: s("SENT")?._count._all ?? 0 },
          overdue: { total: v("OVERDUE"), count: s("OVERDUE")?._count._all ?? 0 },
          drafts: { total: v("DRAFT"), count: s("DRAFT")?._count._all ?? 0 },
          cancelled: s("CANCELLED")?._count._all ?? 0,
          topClients: top.map((t) => ({
            client: clients.find((c) => c.id === t.clientId)?.name,
            total: Number(t._sum.total ?? 0),
            invoices: t._count._all,
          })),
        };
      },
    }),

    queryDatabase: tool({
      description:
        "تنفيذ استعلام SQL للقراءة فقط (PostgreSQL) للأسئلة المالية التي لا تغطيها الأدوات الأخرى. " +
        `يجب أن يتضمن الاستعلام الشرط "userId" = '${userId}' على جدول Invoice أو Client أو Product.\n` +
        DB_SCHEMA_DOC,
      inputSchema: z.object({
        sql: z.string().describe("جملة SELECT واحدة"),
        purpose: z.string().describe("ما الذي يجيب عنه هذا الاستعلام"),
      }),
      execute: async ({ sql }) => {
        try {
          const rows = await runReadOnlySql(userId, sql);
          return { rowCount: rows.length, rows };
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),

    updateInvoiceStatus: tool({
      description:
        "تغيير حالة فاتورة. عند تعيين PAID أو CANCELLED تنتقل الفاتورة تلقائياً إلى الأرشيف.",
      inputSchema: z.object({
        invoiceNumber: z.string().describe("رقم الفاتورة مثل INV-2026-0001"),
        status: z.enum(INVOICE_STATUSES),
      }),
      execute: async ({ invoiceNumber, status }) => {
        const inv = await prisma.invoice.findFirst({ where: { userId, number: invoiceNumber } });
        if (!inv) return { error: "الفاتورة غير موجودة" };
        return brief(await setInvoiceStatus(userId, inv.id, status));
      },
    }),

    archiveInvoice: tool({
      description: "أرشفة فاتورة (archive=true) أو استرجاعها من الأرشيف (archive=false).",
      inputSchema: z.object({ invoiceNumber: z.string(), archive: z.boolean() }),
      execute: async ({ invoiceNumber, archive }) => {
        const inv = await prisma.invoice.findFirst({ where: { userId, number: invoiceNumber } });
        if (!inv) return { error: "الفاتورة غير موجودة" };
        return brief(await setArchived(userId, inv.id, archive));
      },
    }),

    getReminderContext: tool({
      description:
        "جلب بيانات فاتورة لصياغة رسالة تذكير بالدفع (اسم العميل، بريده، المبلغ، أيام التأخير). بعدها اكتب الرسالة بنفسك.",
      inputSchema: z.object({ invoiceNumber: z.string() }),
      execute: async ({ invoiceNumber }) => {
        try {
          const ctx = await reminderContext(userId, { number: invoiceNumber });
          const inv = await prisma.invoice.findFirst({ where: { userId, number: invoiceNumber } });
          return { ...ctx, url: `/invoices/${inv?.id}` };
        } catch {
          return { error: "الفاتورة غير موجودة" };
        }
      },
    }),
  };
}

export type AgentTools = ReturnType<typeof buildTools>;
