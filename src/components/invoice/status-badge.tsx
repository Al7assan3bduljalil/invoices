import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_VARIANT, type InvoiceStatusValue } from "@/lib/invoice-status";

export function StatusBadge({ status }: { status: InvoiceStatusValue }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}
