import { tableCompanies } from "@/schema/companies.schema";
import { createSelectSchema } from "drizzle-zod";
import z from "zod";

// Admin Company Response Schema

const adminCompanyBaseSchema = createSelectSchema(tableCompanies).pick({
  id: true,
  cnpj: true,
  name: true,
  city: true,
});

export const adminCompanyResponseSchema = adminCompanyBaseSchema
  .extend({
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

// Admin Companies List Response Schema (Paginated)

export const adminCompaniesListResponseSchema = z.object({
  data: z.array(adminCompanyResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// Type Exports

export type AdminCompanyResponse = z.infer<typeof adminCompanyResponseSchema>;
export type AdminCompaniesListResponse = z.infer<typeof adminCompaniesListResponseSchema>;
