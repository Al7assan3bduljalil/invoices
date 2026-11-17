"use client";
import type { DashboardStats } from "@/server/stats";
import { formatMoney } from "@/lib/utils";
import { StatusBadge } from "@/components/invoice/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Link from "next/link";

export function DashboardClient({ stats }: { stats: DashboardStats }) {
  const fmt = (n: number) => formatMoney(n, stats.currency);
  const kpiCards = [
    { label: "إجمالي المبيعات", value: fmt(stats.totalSales), icon: "💰", color: "blue" },
    { label: "مدفوعة", value: fmt(stats.paid.total), sub: `${stats.paid.count} فاتورة`, icon: "✅", color: "green" },
    { label: "معلقة", value: fmt(stats.pending.total), sub: `${stats.pending.count} فاتورة`, icon: "⏳", color: "yellow" },
    { label: "متأخرة", value: fmt(stats.overdue.total), sub: `${stats.overdue.count} فاتورة`, icon: "⚠️", color: "red" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">لوحة المؤشرات</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                  <p className="text-xl font-bold mt-1 tabular-nums">{k.value}</p>
                  {k.sub && <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>}
                </div>
                <span className="text-2xl">{k.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle>المبيعات الشهرية (12 شهراً)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.monthly} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend formatter={(v) => v === "paid" ? "مدفوع" : "معلق"} />
              <Bar dataKey="paid" name="paid" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold">{stats.clientsCount}</p>
          <p className="text-sm text-muted-foreground mt-1">عميل</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold">{stats.productsCount}</p>
          <p className="text-sm text-muted-foreground mt-1">منتج / خدمة</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold">{stats.archivedCount}</p>
          <p className="text-sm text-muted-foreground mt-1">في الأرشيف</p>
        </CardContent></Card>
      </div>

      {/* Recent invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>آخر الفواتير</CardTitle>
          <Link href="/invoices" className="text-sm text-blue-600 hover:underline">عرض الكل</Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recent.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/invoices/${r.id}`} className="font-mono text-blue-600 hover:underline">{r.number}</Link>
                  </TableCell>
                  <TableCell>{r.client}</TableCell>
                  <TableCell className="tabular-nums">{formatMoney(r.total, r.currency)}</TableCell>
                  <TableCell><StatusBadge status={r.status as never} /></TableCell>
                </TableRow>
              ))}
              {stats.recent.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">لا توجد فواتير بعد</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
