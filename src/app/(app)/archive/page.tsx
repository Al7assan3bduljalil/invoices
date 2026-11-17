import Link from "next/link";
import { getCurrentUser } from "@/server/current-user";
import { listInvoices } from "@/server/invoices";
import { ArchiveTable } from "./archive-table";

export default async function ArchivePage() {
  const user = await getCurrentUser();
  const invoices = await listInvoices(user.id, { archived: true });
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الأرشيف</h1>
          <p className="text-sm text-muted-foreground mt-0.5">الفواتير المدفوعة والملغاة تُنقل هنا تلقائياً</p>
        </div>
        <Link href="/invoices" className="text-sm text-blue-600 hover:underline">← الفواتير النشطة</Link>
      </div>
      <ArchiveTable invoices={invoices} />
    </div>
  );
}
