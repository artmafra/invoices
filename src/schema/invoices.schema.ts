import { tableServices } from "@/schema/services.schema";
import { tableSuppliers } from "@/schema/suppliers.schema";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod";

// INVOICE STATUS

export const INVOICE_STATUSES = ["draft", "issued", "paid", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// INVOICE SCHEMA

export const tableInvoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierCnpj: text("supplier_cnpj")
    .notNull()
    .references(() => tableSuppliers.cnpj),
  serviceCode: text("service_code")
    .notNull()
    .references(() => tableServices.code),
  status: text("status", { enum: INVOICE_STATUSES }).notNull().default("draft"),
  entryDate: timestamp("entry_date").notNull().defaultNow(), // Data entrada
  issueDate: timestamp("issue_date").notNull(), // Data de emissão
  dueDate: timestamp("due_date").notNull(), // Data vencimento
  valueCents: integer("value_cents").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  materialDeductionCents: integer("material_deduction_cents").notNull().default(0),
  netAmountCents: integer("net_amount_cents").notNull(), // Líquido a receber
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(tableInvoices);
export const updateInvoiceSchema = createUpdateSchema(tableInvoices);

export const createInvoiceSchema = insertInvoiceSchema
  .omit({
    id: true,
    netAmountCents: true,
  })
  .extend({
    inssPercent: z.number().optional(),
    csPercent: z.number().optional(),
    issqnPercent: z.number().optional(),
  });

export type Invoice = typeof tableInvoices.$inferSelect;
export type InsertInvoiceSchema = z.infer<typeof insertInvoiceSchema>;
export type UpdateInvoiceSchema = z.infer<typeof updateInvoiceSchema>;
export type CreateInvoiceSchema = z.infer<typeof createInvoiceSchema>;
