import { z } from "zod";
import { extractCnpjDigits } from "@/lib/cnpj-service-code";
import { baseQuerySchema } from "./query.validations";

// ========================================
// Company Param Schemas
// ========================================

export const companyIdParamSchema = z.object({
  companyId: z.string().uuid("Invalid company ID"),
});

export type CompanyIdParam = z.infer<typeof companyIdParamSchema>;

// ========================================
// Company Query Schemas
// ========================================

export const getCompaniesQuerySchema = baseQuerySchema.extend({
  search: z.string().optional(),
  city: z.string().optional(),
  cnpj: z.string().max(18).optional(),
  name: z.string().optional(),
});

export type GetCompaniesQuery = z.infer<typeof getCompaniesQuerySchema>;

// ========================================
// Company Validation Schemas
// ========================================

const cnpjValidation = z
  .string()
  .min(1, "CNPJ is required")
  .refine((cnpj) => extractCnpjDigits(cnpj).length === 14, "CNPJ must have exactly 14 digits");

const nameValidation = z.string().trim().min(1, "Name is required").max(200);

const cityValidation = z.string().trim().min(1, "City is required").max(100);

export const createCompanySchema = z.object({
  cnpj: cnpjValidation,
  name: nameValidation,
  city: cityValidation,
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z.object({
  cnpj: cnpjValidation.optional(),
  name: nameValidation.optional(),
  city: cityValidation.optional(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
