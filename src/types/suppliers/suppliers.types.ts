import { tableSuppliers } from "@/schema/suppliers.schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// Admin Invoice Response Schema
// ========================================

// Base schema from database table
const adminSupplierBaseSchema = createSelectSchema(tableSuppliers).pick({
  id: true,
  name: true,
  city: true,
  taxRegime: true,
  cnpj: true,
});

// Extended schema with relations and JSON serialization
export const adminSupplierResponseSchema = adminSupplierBaseSchema
  .extend({
    createdAt: z.string(),
    updatedAt: z.string(),
    obs: z.string().nullable(),
  })
  .strict();

// ========================================
// Admin Invoices List Response Schema (Paginated)
// ========================================

export const adminSuppliersListResponseSchema = z.object({
  data: z.array(adminSupplierResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// ========================================
// Type Exports
// ========================================

export type AdminSupplierResponse = z.infer<typeof adminSupplierResponseSchema>;
export type AdminSuppliersListResponse = z.infer<typeof adminSuppliersListResponseSchema>;
