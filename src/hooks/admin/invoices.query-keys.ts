import type { InvoiceFilters } from "./use-invoices";

export const INVOICES_QUERY_KEYS = {
  all: ["admin", "invoices"] as const,

  lists: () => [...INVOICES_QUERY_KEYS.all, "list"] as const,

  list: (filters: InvoiceFilters, page: number, limit: number) =>
    [...INVOICES_QUERY_KEYS.lists(), { filters, page, limit }] as const,

  details: () => [...INVOICES_QUERY_KEYS.all, "detail"] as const,

  detail: (invoiceId: string) => [...INVOICES_QUERY_KEYS.details(), invoiceId] as const,
};
