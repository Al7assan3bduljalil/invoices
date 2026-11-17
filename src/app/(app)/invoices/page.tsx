import Link from "next/link";
import { getCurrentUser } from "@/server/current-user";
import { listInvoices } from "@/server/invoices";
import { InvoicesTable } from "./invoices-table";

export default async function InvoicesPage() {
  const user = await getCurrentUser();
  const invoices = await listInvoices(user.id, { archived: false });
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الفواتير</h1>
        <Link href="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
          + فاتورة جديدة
        </Link>
      </div>
      <InvoicesTable invoices={invoices} />
    </div>
  );
}
