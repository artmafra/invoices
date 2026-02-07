import {
  tableInvoices,
  type InsertInvoiceSchema,
  type Invoice,
  type UpdateInvoiceSchema,
} from "@/schema/invoices.schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/postgres";
import type { BaseStorage } from "@/storage/types";

export interface InvoiceFilterOptions {
  dueDateRange?: DateRange;
  issueDateRange?: DateRange;
  entryDateRange?: DateRange;
}

interface DateRange {
  from?: Date;
  to?: Date;
}

export class InvoicesStorage implements BaseStorage<Invoice> {
  async findMany(filters?: InvoiceFilterOptions) {
    let query = db.select().from(tableInvoices).$dynamic();
    const conditions = [];

    if (filters?.issueDateRange) {
      const { from, to } = filters.issueDateRange;

      if (from) {
        conditions.push(gte(tableInvoices.issueDate, from));
      }

      if (to) {
        conditions.push(lte(tableInvoices.issueDate, to));
      }
    }

    if (filters?.dueDateRange) {
      const { from, to } = filters.dueDateRange;

      if (from) {
        conditions.push(gte(tableInvoices.dueDate, from));
      }

      if (to) {
        conditions.push(lte(tableInvoices.dueDate, to));
      }
    }

    if (filters?.entryDateRange) {
      const { from, to } = filters.entryDateRange;

      if (from) {
        conditions.push(gte(tableInvoices.entryDate, from));
      }

      if (to) {
        conditions.push(lte(tableInvoices.entryDate, to));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query;
  }

  async findById(id: string) {
    const result = await db.select().from(tableInvoices).where(eq(tableInvoices.id, id));
    return result[0];
  }

  async create(data: InsertInvoiceSchema) {
    const result = await db.insert(tableInvoices).values(data).returning();
    return result[0];
  }

  async update(id: string, data: UpdateInvoiceSchema) {
    const result = await db
      .update(tableInvoices)
      .set(data)
      .where(eq(tableInvoices.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string) {
    const result = await db.delete(tableInvoices).where(eq(tableInvoices.id, id)).returning();
    return result.length > 0;
  }
}
