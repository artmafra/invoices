import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { InsertServiceSchema, UpdateServiceSchema } from "@/schema/services.schema";
import type { TaxRates } from "@/schema/services.schema";
import { parseCsvLine, parseCsvTaxRate } from "@/lib/csv-parsing";
import { serviceStorage } from "@/storage/runtime/service";
import type { ServiceFilterOptions } from "@/storage/services.storage";

export class ServiceService {
  async getCollectionVersion(filters?: ServiceFilterOptions) {
    return await serviceStorage.getCollectionVersion(filters);
  }

  async getAllServices(companyId?: string) {
    return await serviceStorage.findMany({ companyId });
  }

  async getServicesPaginated(
    filters: { search?: string; companyId?: string } = {},
    page: number = 1,
    limit: number = 20,
  ) {
    return await serviceStorage.findManyPaginated(filters, page, limit);
  }

  async getServiceById(id: string) {
    return await serviceStorage.findById(id);
  }

  async getServiceByCode(code: string) {
    return await serviceStorage.findByCode(code);
  }

  async updateService(id: string, data: UpdateServiceSchema) {
    return await serviceStorage.update(id, data);
  }

  async createService(data: InsertServiceSchema) {
    return await serviceStorage.create(data);
  }

  async deleteService(id: string) {
    return await serviceStorage.delete(id);
  }

  async isServiceCodeAvailable(
    code: string,
    companyId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await serviceStorage.findByCodeAndCompany(code, companyId);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }

  /**
   * Import all services from a predefined CSV template into a company.
   * The CSVs in public/templates/ have a DÉBITO column at [3], then:
   * SN [4-7], N [8-11], MEI [12-15], obs [16+].
   */
  async importServicesFromTemplate(
    companyId: string,
    templateId: "1" | "2" | "3",
  ): Promise<{ created: number; updated: number }> {
    const csvPath = resolve(process.cwd(), `public/templates/services-template-${templateId}.csv`);

    let content: string;
    try {
      content = readFileSync(csvPath, "utf-8");
    } catch {
      throw new Error(`Template ${templateId} not found`);
    }

    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) throw new Error("Invalid CSV format");

    const separator = lines[0].includes(";") ? ";" : ",";

    const dataLines = lines.slice(1).filter((line) => {
      const fields = parseCsvLine(line, separator);
      const codeCell = fields[1]?.trim();
      return (
        codeCell &&
        !codeCell.toUpperCase().startsWith("CÓDIGO") &&
        !codeCell.toUpperCase().startsWith("CADASTRO") &&
        !codeCell.toUpperCase().startsWith("SN") &&
        !codeCell.toUpperCase().startsWith("N") &&
        !codeCell.toUpperCase().startsWith("MEI") &&
        !codeCell.toUpperCase().startsWith("DÉBITO") &&
        !codeCell.toUpperCase().startsWith("DEBITO")
      );
    });

    const services: Array<{
      code: string;
      description: string;
      sn: TaxRates;
      n: TaxRates;
      mei: TaxRates;
      obs: string | null;
    }> = [];

    for (const line of dataLines) {
      const fields = parseCsvLine(line, separator);
      if (fields.length < 15) continue;

      const code = fields[1]?.trim();
      const description = fields[2]?.trim();
      if (!code || !description) continue;

      // [3]=DÉBITO, [4-7]=SN, [8-11]=N, [12-15]=MEI, [16+]=obs
      services.push({
        code,
        description,
        sn: {
          issqn: parseCsvTaxRate(fields[4] ?? ""),
          inss: parseCsvTaxRate(fields[5] ?? ""),
          cs: parseCsvTaxRate(fields[6] ?? ""),
          irrf: parseCsvTaxRate(fields[7] ?? ""),
        },
        n: {
          issqn: parseCsvTaxRate(fields[8] ?? ""),
          inss: parseCsvTaxRate(fields[9] ?? ""),
          cs: parseCsvTaxRate(fields[10] ?? ""),
          irrf: parseCsvTaxRate(fields[11] ?? ""),
        },
        mei: {
          issqn: parseCsvTaxRate(fields[12] ?? ""),
          inss: parseCsvTaxRate(fields[13] ?? ""),
          cs: parseCsvTaxRate(fields[14] ?? ""),
          irrf: parseCsvTaxRate(fields[15] ?? ""),
        },
        obs: fields[16]?.trim() || null,
      });
    }

    return await serviceStorage.upsertMany(companyId, services);
  }
}
