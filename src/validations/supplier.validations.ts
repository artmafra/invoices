import { SUPPLIER_TAX_REGIME } from "@/schema/suppliers.schema";
import { z } from "zod";
import { baseQuerySchema } from "./query.validations";

// ========================================
// Supplier Param Schemas
// ========================================

export const supplierIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type SupplierIdParam = z.infer<typeof supplierIdParamSchema>;

export const supplierCnpjParamSchema = z.object({
  cnpj: z.string().length(14, "Invalid CNPJ format"),
});

export type SupplierCnpjParam = z.infer<typeof supplierCnpjParamSchema>;

// ========================================
// Supplier Query Schemas
// ========================================

export const supplierTaxRegimeSchema = z.enum(SUPPLIER_TAX_REGIME);

export const getSuppliersQuerySchema = baseQuerySchema.extend({
  taxRegime: supplierTaxRegimeSchema.optional(),
  city: z.string().optional(),
  name: z.string().optional(),
  cnpj: z.string().length(14).optional(),
});

// ========================================
// Supplier Validation Schemas
// ========================================

const cnpjValidation = z
  .string()
  .trim()
  .regex(/^\d{14}$/, "CNPJ must contain exactly 14 digits");

const nameValidation = z.string().trim().min(1, "Name is required").max(200);

const cityValidation = z.string().trim().min(1, "City is required").max(100);

/** Client-side schema (form) */
export const createSupplierSchema = z.object({
  cnpj: cnpjValidation,
  name: nameValidation,
  city: cityValidation,
  taxRegime: supplierTaxRegimeSchema,
});

/** Server-side schema (API) */
export const createSupplierRequestSchema = createSupplierSchema;

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z.object({
  cnpj: cnpjValidation.optional(),
  name: nameValidation.optional(),
  city: cityValidation.optional(),
  taxRegime: supplierTaxRegimeSchema.optional(),
});

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
