import { z } from "zod";
import { baseQuerySchema } from "./query.validations";

// ========================================
// Service Param Schemas
// ========================================

export const serviceIdParamSchema = z.object({
  id: z.string().uuid("Invalid service ID"),
});

export type ServiceIdParam = z.infer<typeof serviceIdParamSchema>;

export const serviceCodeParamSchema = z.object({
  code: z.string().min(1, "Service code is required"),
});

export type ServiceCodeParam = z.infer<typeof serviceCodeParamSchema>;

// ========================================
// Service Query Schemas
// ========================================

export const getServicesQuerySchema = baseQuerySchema.extend({
  search: z.string().optional(),
  companyId: z.string().uuid().optional(),
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
  .max(25, "Service code must be at most 25 characters");

const descriptionValidation = z
  .string()
  .trim()
  .min(1, "Description is required")
  .max(500, "Description must be at most 500 characters");

/** Client-side schema (form) */
export const createServiceSchema = z.object({
  companyId: z.string().uuid(),
  code: codeValidation,
  description: descriptionValidation,
  sn: taxRatesValidation,
  n: taxRatesValidation,
  mei: taxRatesValidation,
  obs: z.string().optional(),
});

/** Server-side schema (API) */
export const createServiceRequestSchema = createServiceSchema;

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z.object({
  code: codeValidation.optional(),
  description: descriptionValidation.optional(),
  sn: taxRatesValidation.optional(),
  n: taxRatesValidation.optional(),
  mei: taxRatesValidation.optional(),
  obs: z.string().optional(),
});

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

// ========================================
// Import Services from Template Schema
// ========================================

export const importServicesFromTemplateSchema = z.object({
  templateId: z.enum(["1", "2", "3"]),
  companyId: z.string().uuid(),
});

export type ImportServicesFromTemplateInput = z.infer<typeof importServicesFromTemplateSchema>;
