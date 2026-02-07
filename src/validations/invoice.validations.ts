import { INVOICE_STATUSES } from "@/schema/invoices.schema";
import { z } from "zod";
import { baseQuerySchema } from "./query.validations";

// ========================================
// Invoice Constants
// ========================================

export const MAX_INVOICE_VALUE_CENTS = 1_000_000_000; // 10 millions

// ========================================
// Invoice Param Schemas
// ========================================

export const invoiceIdParamSchema = z.object({
  invoiceId: z.uuid("Invalid invoice ID format"),
});

export type InvoiceIdParam = z.infer<typeof invoiceIdParamSchema>;

// ========================================
// Invoice Query Schemas
// ========================================

export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);

export const getInvoicesQuerySchema = baseQuerySchema.extend({
  status: invoiceStatusSchema.optional(),
  supplierCnpj: z.string().length(14).optional(),
  serviceCode: z.string().optional(),
  issueDateFrom: z.string().datetime().optional(),
  issueDateTo: z.string().datetime().optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
});

// ========================================
// Invoice Validation Schemas
// ========================================

export const createInvoiceSchema = z.object({
  status: invoiceStatusSchema.optional(),
  supplierCnpj: z.string().length(14, "Invalid CNPJ"),
  serviceCode: z.string().min(1),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  valueCents: z.number().int().positive().max(MAX_INVOICE_VALUE_CENTS),
  invoiceNumber: z.string().min(1).max(50),
  materialDeductionCents: z.number().int().min(0).optional(),

  inssPercent: z.number().min(0).max(100).optional(),
  csPercent: z.number().min(0).max(100).optional(),
  issqnPercent: z.number().min(0).max(100).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  status: invoiceStatusSchema.optional(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  valueCents: z.number().int().positive().optional(),
  invoiceNumber: z.string().min(1).max(50).optional(),
  materialDeductionCents: z.number().int().min(0).nullable().optional(),

  inssPercent: z.number().min(0).max(100).nullable().optional(),
  csPercent: z.number().min(0).max(100).nullable().optional(),
  issqnPercent: z.number().min(0).max(100).nullable().optional(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
