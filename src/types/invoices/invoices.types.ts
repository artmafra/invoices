import { tableInvoices } from "@/schema/invoices.schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// Admin Invoice Response Schema
// ========================================

// Base schema from database table
const adminInvoiceBaseSchema = createSelectSchema(tableInvoices).pick({
  id: true,
  supplierCnpj: true,
  serviceCode: true,
  status: true,
  valueCents: true,
  invoiceNumber: true,
  materialDeductionCents: true,
  netAmountCents: true,
});

// Extended schema with relations and JSON serialization
export const adminInvoiceResponseSchema = adminInvoiceBaseSchema
  .extend({
    // Date fields as strings for JSON serialization
    entryDate: z.date(),
    issueDate: z.date(),
    dueDate: z.date(),
    createdAt: z.string(),
    updatedAt: z.string(),

    // Related supplier
    supplier: z
      .object({
        cnpj: z.string(),
        name: z.string(),
      })
      .nullable(),

    // Related service
    service: z
      .object({
        code: z.string(),
        name: z.string(),
      })
      .nullable(),
  })
  .strict();

// ========================================
// Admin Invoices List Response Schema (Paginated)
// ========================================

export const adminInvoicesListResponseSchema = z.object({
  data: z.array(adminInvoiceResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// ========================================
// Type Exports
// ========================================

export type AdminInvoiceResponse = z.infer<typeof adminInvoiceResponseSchema>;
export type AdminInvoicesListResponse = z.infer<typeof adminInvoicesListResponseSchema>;
