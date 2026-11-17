import { prisma } from "@/lib/prisma";
import { refreshOverdue } from "./invoices";

/** إحصائيات لوحة المؤشرات. الفواتير الملغاة مستبعدة من المبيعات. */
export async function getDashboardStats(userId: string) {
  await refreshOverdue(userId);

  const [byStatus, user, clientsCount, productsCount, archivedCount, recent] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["status"],
      where: { userId },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.client.count({ where: { userId } }),
    prisma.product.count({ where: { userId } }),
    prisma.invoice.count({ where: { userId, archivedAt: { not: null } } }),
    prisma.invoice.findMany({
      where: { userId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const get = (s: string) => byStatus.find((r) => r.status === s);
  const sum = (s: string) => Number(get(s)?._sum.total ?? 0);
  const count = (s: string) => get(s)?._count._all ?? 0;

  const totalSales = sum("PAID") + sum("SENT") + sum("OVERDUE");

  // المبيعات الشهرية لآخر 12 شهراً
  const monthly = await prisma.$queryRaw<{ month: Date; paid: number; pending: number }[]>`
    SELECT date_trunc('month', "issueDate") AS month,
           COALESCE(SUM(CASE WHEN status = 'PAID' THEN total END), 0)::float AS paid,
           COALESCE(SUM(CASE WHEN status IN ('SENT','OVERDUE') THEN total END), 0)::float AS pending
    FROM "Invoice"
    WHERE "userId" = ${userId}
      AND "issueDate" >= date_trunc('month', now()) - interval '11 months'
    GROUP BY 1 ORDER BY 1`;

  const months: { month: string; paid: number; pending: number }[] = [];
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() - 11);
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const row = monthly.find(
      (m) => m.month.getUTCFullYear() === d.getFullYear() && m.month.getUTCMonth() === d.getMonth(),
    );
    months.push({
      month: new Intl.DateTimeFormat("ar-EG", { month: "short" }).format(d),
      paid: row?.paid ?? 0,
      pending: row?.pending ?? 0,
    });
  }

  return {
    currency: user.currency,
    totalSales,
    paid: { total: sum("PAID"), count: count("PAID") },
    pending: { total: sum("SENT"), count: count("SENT") },
    overdue: { total: sum("OVERDUE"), count: count("OVERDUE") },
    draft: { total: sum("DRAFT"), count: count("DRAFT") },
    cancelled: { count: count("CANCELLED") },
    clientsCount,
    productsCount,
    archivedCount,
    monthly: months,
    recent: recent.map((r) => ({
      id: r.id,
      number: r.number,
      client: r.client.name,
      total: Number(r.total),
      currency: r.currency,
      status: r.status,
      issueDate: r.issueDate.toISOString(),
      archived: r.archivedAt != null,
    })),
  };
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
