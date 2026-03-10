import { z } from "zod";
import { baseQuerySchema } from "./query.validations";

// ========================================
// Service Param Schemas
// ========================================

export const serviceCodeParamSchema = z.object({
  code: z.string().min(1, "Service code is required"),
});

export type ServiceCodeParam = z.infer<typeof serviceCodeParamSchema>;

// ========================================
// Service Query Schemas
// ========================================

export const getServicesQuerySchema = baseQuerySchema.extend({
  search: z.string().optional(),
});

// ========================================
// Tax Rates Schema
// ========================================

const taxRatesValidation = z.object({
  issqn: z.number().min(0).max(100).nullable(),
  inss: z.number().min(0).max(100).nullable(),
  cs: z.number().min(0).max(100).nullable(),
  irrf: z.number().min(0).max(100).nullable(),
});

// ========================================
// Service Validation Schemas
// ========================================

const codeValidation = z
  .string()
  .trim()
  .min(1, "Service code is required")
  .max(20, "Service code must be at most 20 characters");

const descriptionValidation = z
  .string()
  .trim()
  .min(1, "Description is required")
  .max(500, "Description must be at most 500 characters");

const debitValidation = z
  .string()
  .trim()
  .min(1, "Debit is required")
  .max(100, "Debit must be at most 100 characters");

/** Client-side schema (form) */
export const createServiceSchema = z.object({
  code: codeValidation,
  description: descriptionValidation,
  debit: debitValidation,
  sn: taxRatesValidation,
  n: taxRatesValidation,
  mei: taxRatesValidation,
  obs: z.string().optional(),
});

/** Server-side schema (API) */
export const createServiceRequestSchema = createServiceSchema;

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z.object({
  description: descriptionValidation.optional(),
  debit: debitValidation.optional(),
  sn: taxRatesValidation.optional(),
  n: taxRatesValidation.optional(),
  mei: taxRatesValidation.optional(),
  obs: z.string().optional(),
});

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
