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

export const getInvoicesQuerySchema = baseQuerySchema
  .extend({
    status: invoiceStatusSchema.optional(),
    supplierCnpj: z.string().length(14).optional(),
    serviceCode: z.string().optional(),

    issueDateFrom: z.coerce.date().optional(),
    issueDateTo: z.coerce.date().optional(),

    dueDateFrom: z.coerce.date().optional(),
    dueDateTo: z.coerce.date().optional(),
  })
  .refine(
    (data) => !data.issueDateFrom || !data.issueDateTo || data.issueDateFrom <= data.issueDateTo,
    {
      message: "issueDateFrom must be before issueDateTo",
      path: ["issueDateTo"],
    },
  )
  .refine((data) => !data.dueDateFrom || !data.dueDateTo || data.dueDateFrom <= data.dueDateTo, {
    message: "dueDateFrom must be before dueDateTo",
    path: ["dueDateTo"],
  });

// ========================================
// Invoice Validation Schemas
// ========================================

export const createInvoiceSchema = z
  .object({
    status: invoiceStatusSchema.optional(),
    supplierCnpj: z.string().length(14, "Invalid CNPJ"),
    serviceCode: z.string().min(1),

    issueDate: z.coerce.date().refine((v) => v instanceof Date, { message: "Invalid date" }),
    dueDate: z.coerce.date().refine((v) => v instanceof Date, { message: "Invalid date" }),
    entryDate: z.coerce.date().refine((v) => v instanceof Date, { message: "Invalid date" }),

    valueCents: z.number().int().positive().max(MAX_INVOICE_VALUE_CENTS),
    invoiceNumber: z.string().min(1).max(50),
    materialDeductionCents: z.number().int().min(0).optional(),

    inssPercent: z.number().min(0).max(100).optional(),
    csPercent: z.number().min(0).max(100).optional(),
    issqnPercent: z.number().min(0).max(100).optional(),
  })
  .refine((data) => !data.dueDate || !data.issueDate || data.dueDate > data.issueDate, {
    message: "Due date must be after issue date",
    path: ["dueDate"],
  });

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z
  .object({
    status: invoiceStatusSchema.optional(),
    supplierCnpj: z.string(),
    serviceCode: z.string(),

    issueDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),

    valueCents: z.number().int().positive().optional(),
    invoiceNumber: z.string().min(1).max(50).optional(),

    materialDeductionCents: z.number().int().min(0).optional(),

    inssPercent: z.number().min(0).max(100).nullable().optional(),
    csPercent: z.number().min(0).max(100).nullable().optional(),
    issqnPercent: z.number().min(0).max(100).nullable().optional(),
  })
  .refine((data) => !data.issueDate || !data.dueDate || data.dueDate > data.issueDate, {
    message: "Due date must be after issue date",
    path: ["dueDate"],
  });

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
