import type { InvoiceStatusValue } from "./invoice-status";

export type ClientDTO = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxNumber: string | null;
  notes: string | null;
  createdAt: string;
  _count?: { invoices: number };
};

export type ProductDTO = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  price: number;
  taxRate: number | null;
  isActive: boolean;
};

export type InvoiceItemDTO = {
  id?: string;
  productId: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceDTO = {
  id: string;
  number: string;
  status: InvoiceStatusValue;
  issueDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: number | null;
  exchangeCurrency: string;
  showExchangeRate: boolean;
  taxRate: number;
  discount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  paidAt: string | null;
  archivedAt: string | null;
  shareToken: string;
  createdByAI: boolean;
  client: ClientDTO;
  items: InvoiceItemDTO[];
};
