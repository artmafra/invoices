import {
  tableInvoices,
  type InsertInvoiceSchema,
  type Invoice,
  type InvoiceStatus,
  type UpdateInvoiceSchema,
} from "@/schema/invoices.schema";
import { tableServices, type TaxRates, type TaxRegime } from "@/schema/services.schema";
import { tableSuppliers, type SupplierTaxRegime } from "@/schema/suppliers.schema";
import { and, asc, count, desc, eq, gte, ilike, lte, max, type SQL } from "drizzle-orm";
import { versionCache } from "@/lib/cache/version-cache.service";
import { db } from "@/db/postgres";
import type { BaseStorage, PaginatedResult, PaginationOptions } from "@/storage/types";
import { paginate } from "./helpers/pagination";

export interface InvoiceFilterOptions {
  search?: string;
  companyId?: string;
  status?: InvoiceStatus;
  supplierCnpj?: string;
  serviceCode?: string;
  issueDateRange?: DateRange;
  dueDateRange?: DateRange;
  entryDateRange?: DateRange;
}

export interface InvoiceWithRelations extends Invoice {
  supplier: {
    cnpj: string;
    name: string;
    city: string;
    taxRegime: SupplierTaxRegime;
  } | null;

  service: {
    code: string;
    description: string;
    taxRates: TaxRates;
  } | null;
}

interface DateRange {
  from?: Date;
  to?: Date;
}

export class InvoicesStorage implements BaseStorage<Invoice> {
  private buildWhereConditions(filters?: InvoiceFilterOptions) {
    const conditions: SQL[] = [];

    if (!filters) return conditions;

    // Status
    if (filters.status) {
      conditions.push(eq(tableInvoices.status, filters.status));
    }

    if (filters.companyId) {
      conditions.push(eq(tableInvoices.companyId, filters.companyId));
    }

    // Supplier (partial match — user may type a partial CNPJ)
    if (filters.supplierCnpj) {
      conditions.push(ilike(tableInvoices.supplierCnpj, `%${filters.supplierCnpj}%`));
    }

    // Service (partial match — user may type a partial service code)
    if (filters.serviceCode) {
      conditions.push(ilike(tableInvoices.serviceCode, `%${filters.serviceCode}%`));
    }

    // Search (invoiceNumber como padrão)
    if (filters.search) {
      conditions.push(ilike(tableInvoices.invoiceNumber, `%${filters.search}%`));
    }

    // Issue date range
    if (filters.issueDateRange) {
      const { from, to } = filters.issueDateRange;

      if (from) conditions.push(gte(tableInvoices.issueDate, from));
      if (to) conditions.push(lte(tableInvoices.issueDate, to));
    }

    // Due date range
    if (filters.dueDateRange) {
      const { from, to } = filters.dueDateRange;

      if (from) conditions.push(gte(tableInvoices.dueDate, from));
      if (to) conditions.push(lte(tableInvoices.dueDate, to));
    }

    // Entry date range
    if (filters.entryDateRange) {
      const { from, to } = filters.entryDateRange;

      if (from) conditions.push(gte(tableInvoices.entryDate, from));
      if (to) conditions.push(lte(tableInvoices.entryDate, to));
    }

    return conditions;
  }

  async getCollectionVersion(
    filters: InvoiceFilterOptions = {},
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    const cacheKey = versionCache.buildCacheKey("invoices", filters);

    return versionCache.getOrFetch(cacheKey, async () => {
      const conditions = this.buildWhereConditions(filters);
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db
        .select({
          maxUpdatedAt: max(tableInvoices.updatedAt),
          count: count(tableInvoices.id),
        })
        .from(tableInvoices);

      const [result] = whereClause ? await query.where(whereClause) : await query;

      return {
        maxUpdatedAt: result?.maxUpdatedAt ? new Date(result.maxUpdatedAt) : null,
        count: result?.count ?? 0,
      };
    });
  }

  private buildOrderBy(sortBy?: string, sortOrder?: "asc" | "desc") {
    const direction = sortOrder === "asc" ? asc : desc;

    switch (sortBy) {
      case "dueDate":
        return direction(tableInvoices.dueDate);
      case "entryDate":
        return direction(tableInvoices.entryDate);
      case "valueCents":
        return direction(tableInvoices.valueCents);
      case "status":
        return direction(tableInvoices.status);
      default:
        return direction(tableInvoices.issueDate);
    }
  }

  async findManyPaginated(
    filters: InvoiceFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<InvoiceWithRelations>> {
    const { sortBy, sortOrder } = options;
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Supplier subquery
    const supplierSub = db
      .select({
        cnpj: tableSuppliers.cnpj,
        name: tableSuppliers.name,
        city: tableSuppliers.city,
        taxRegime: tableSuppliers.taxRegime,
      })
      .from(tableSuppliers)
      .as("supplier");

    // Service subquery
    const serviceSub = db
      .select({
        code: tableServices.code,
        description: tableServices.description,
        sn: tableServices.sn,
        n: tableServices.n,
        mei: tableServices.mei,
      })
      .from(tableServices)
      .as("service");

    // Queries
    let countQuery = db.select({ count: count(tableInvoices.id) }).from(tableInvoices);

    let dataQuery = db
      .select({
        invoice: tableInvoices,
        supplier: {
          cnpj: supplierSub.cnpj,
          name: supplierSub.name,
          city: supplierSub.city,
          taxRegime: supplierSub.taxRegime,
        },
        service: {
          code: serviceSub.code,
          description: serviceSub.description,
          sn: serviceSub.sn,
          n: serviceSub.n,
          mei: serviceSub.mei,
        },
      })
      .from(tableInvoices)
      .leftJoin(supplierSub, eq(tableInvoices.supplierCnpj, supplierSub.cnpj))
      .leftJoin(serviceSub, eq(tableInvoices.serviceCode, serviceSub.code))
      .orderBy(orderBy);

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    const result = await paginate({
      dataQuery,
      countQuery,
      options,
    });

    // Map final structure
    const data: InvoiceWithRelations[] = result.data.map(({ invoice, supplier, service }) => {
      const regime = (supplier?.taxRegime?.toLowerCase() ?? "n") as TaxRegime;
      const taxRates: TaxRates = service?.code
        ? (service[regime] ?? { issqn: null, inss: null, cs: null, irrf: null })
        : { issqn: null, inss: null, cs: null, irrf: null };

      return {
        ...invoice,
        supplier: supplier?.cnpj
          ? {
              cnpj: supplier.cnpj,
              name: supplier.name,
              city: supplier.city,
              taxRegime: supplier.taxRegime as SupplierTaxRegime,
            }
          : null,
        service: service?.code
          ? {
              code: service.code,
              description: service.description,
              taxRates,
            }
          : null,
      };
    });

    return {
      ...result,
      data,
    };
  }

  async findMany(filters?: InvoiceFilterOptions) {
    let query = db.select().from(tableInvoices).$dynamic();

    const conditions = this.buildWhereConditions(filters);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query;
  }

  async findById(id: string) {
    const result = await db.select().from(tableInvoices).where(eq(tableInvoices.id, id));
    return result[0];
  }

  // For uniqueness check
  async findByNumber(number: string): Promise<Invoice | undefined> {
    const result = await db
      .select()
      .from(tableInvoices)
      .where(ilike(tableInvoices.invoiceNumber, number))
      .limit(1);

    return result[0];
  }
  async create(data: InsertInvoiceSchema) {
    const result = await db.insert(tableInvoices).values(data).returning();
    await versionCache.invalidate("invoices");
    return result[0];
  }

  async update(id: string, data: UpdateInvoiceSchema) {
    const result = await db
      .update(tableInvoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tableInvoices.id, id))
      .returning();
    await versionCache.invalidate("invoices");
    return result[0];
  }

  async delete(id: string) {
    const result = await db.delete(tableInvoices).where(eq(tableInvoices.id, id)).returning();
    await versionCache.invalidate("invoices");
    return result.length > 0;
  }

  async deleteByCompanyId(companyId: string) {
    await db.delete(tableInvoices).where(eq(tableInvoices.companyId, companyId));
    await versionCache.invalidate("invoices");
  }
}
