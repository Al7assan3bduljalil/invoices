import type { Client, Invoice, InvoiceItem, Prisma, Product } from "@prisma/client";
import type { ClientDTO, InvoiceDTO, InvoiceItemDTO, ProductDTO } from "@/lib/types";

const num = (d: Prisma.Decimal | null | undefined) => (d == null ? 0 : Number(d));
const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function serializeClient(c: Client & { _count?: { invoices: number } }): ClientDTO {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    taxNumber: c.taxNumber,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    _count: c._count,
  };
}

export function serializeProduct(p: Product): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    unit: p.unit,
    price: num(p.price),
    taxRate: p.taxRate == null ? null : num(p.taxRate),
    isActive: p.isActive,
  };
}

export function serializeItem(i: InvoiceItem): InvoiceItemDTO {
  return {
    id: i.id,
    productId: i.productId,
    description: i.description,
    unit: i.unit,
    quantity: num(i.quantity),
    unitPrice: num(i.unitPrice),
    lineTotal: num(i.lineTotal),
  };
}

export function serializeInvoice(
  inv: Invoice & { client: Client; items: InvoiceItem[] },
): InvoiceDTO {
  return {
    id: inv.id,
    number: inv.number,
    status: inv.status,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    currency: inv.currency,
    taxRate: num(inv.taxRate),
    discount: num(inv.discount),
    subtotal: num(inv.subtotal),
    taxAmount: num(inv.taxAmount),
    total: num(inv.total),
    notes: inv.notes,
    paidAt: iso(inv.paidAt),
    archivedAt: iso(inv.archivedAt),
    shareToken: inv.shareToken,
    createdByAI: inv.createdByAI,
    client: serializeClient(inv.client),
    items: inv.items.map(serializeItem),
  };
}
