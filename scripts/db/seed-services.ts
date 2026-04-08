import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tableServices } from "@/schema/services.schema";
import type { TaxRates } from "@/schema/services.schema";
import { db } from "@/db/postgres";
import { getBooleanArg, parseArgs } from "../lib/args";

/**
 * Parse a tax rate cell value into a number or null.
 * Handles: "1,00%", "4,65%", "NT", "art 118", empty, etc.
 */
function parseTaxRate(value: string): number | null {
  const trimmed = value.trim().toUpperCase();

  // NT, art references, empty = null (not taxed / not applicable)
  if (!trimmed || trimmed === "NT" || trimmed.startsWith("ART")) {
    return null;
  }

  // Remove % and convert comma decimal separator to dot
  const cleaned = trimmed.replace("%", "").replace(",", ".").trim();
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    return null;
  }

  return num;
}

/**
 * Parse a CSV line respecting quoted fields with semicolons
 */
function parseCsvLine(line: string, separator: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

interface CsvServiceRow {
  code: string;
  description: string;
  sn: TaxRates;
  n: TaxRates;
  mei: TaxRates;
  obs: string | null;
}

function parseServicesFromCsv(filePath: string): CsvServiceRow[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header and one data row");
  }

  // Detect separator (semicolon or comma)
  const headerLine = lines[0];
  const separator = headerLine.includes(";") ? ";" : ",";

  // Skip header rows (title, blank, sub-headers)
  const dataLines = lines.slice(1).filter((line) => {
    const fields = parseCsvLine(line, separator);
    // The CSV has an empty first column, so code is at index 1
    const codeCell = fields[1]?.trim();
    // Skip rows without a code or header-like rows
    return (
      codeCell &&
      !codeCell.toUpperCase().startsWith("CÓDIGO") &&
      !codeCell.toUpperCase().startsWith("CADASTRO")
    );
  });

  const services: CsvServiceRow[] = [];

  for (const line of dataLines) {
    const fields = parseCsvLine(line, separator);

    // CSV has empty first column (index 0), so data starts at index 1
    // 0: empty, 1: code, 2: description
    // SN:  3=ISSQN, 4=INSS, 5=CS, 6=IRRF
    // N:   7=ISSQN, 8=INSS, 9=CS, 10=IRRF
    // MEI: 11=ISSQN, 12=INSS, 13=CS, 14=IRRF
    // 15: empty, 16: OBS

    if (fields.length < 15) {
      console.warn(`Skipping line with insufficient columns (${fields.length}): ${fields[1]}`);
      continue;
    }

    const code = fields[1]?.trim();
    const description = fields[2]?.trim();

    if (!code || !description) {
      console.warn(`Skipping line with missing code or description: ${line.substring(0, 80)}`);
      continue;
    }

    const obsText = fields[16]?.trim() || null;

    services.push({
      code,
      description,
      sn: {
        issqn: parseTaxRate(fields[3] ?? ""),
        inss: parseTaxRate(fields[4] ?? ""),
        cs: parseTaxRate(fields[5] ?? ""),
        irrf: parseTaxRate(fields[6] ?? ""),
      },
      n: {
        issqn: parseTaxRate(fields[7] ?? ""),
        inss: parseTaxRate(fields[8] ?? ""),
        cs: parseTaxRate(fields[9] ?? ""),
        irrf: parseTaxRate(fields[10] ?? ""),
      },
      mei: {
        issqn: parseTaxRate(fields[11] ?? ""),
        inss: parseTaxRate(fields[12] ?? ""),
        cs: parseTaxRate(fields[13] ?? ""),
        irrf: parseTaxRate(fields[14] ?? ""),
      },
      obs: obsText,
    });
  }

  return services;
}

async function seedServices(
  csvPath: string,
  clearExisting: boolean,
  companyId: string,
): Promise<{ inserted: number; skipped: number }> {
  const services = parseServicesFromCsv(csvPath);
  console.log(`Parsed ${services.length} services from CSV`);

  if (clearExisting) {
    console.log("Clearing existing services...");
    await db.delete(tableServices);
    console.log("    Cleared all existing services");
  }

  let inserted = 0;
  let skipped = 0;

  // Insert in batches of 50 for performance
  const batchSize = 50;
  for (let i = 0; i < services.length; i += batchSize) {
    const batch = services.slice(i, i + batchSize);

    const values = batch.map((s) => ({
      companyId,
      code: s.code,
      description: s.description,
      sn: s.sn,
      n: s.n,
      mei: s.mei,
      obs: s.obs,
    }));

    try {
      await db
        .insert(tableServices)
        .values(values)
        .onConflictDoNothing({ target: tableServices.code });

      inserted += batch.length;
    } catch (error) {
      // If batch insert fails, try one by one
      for (const value of values) {
        try {
          await db
            .insert(tableServices)
            .values(value)
            .onConflictDoNothing({ target: tableServices.code });
          inserted++;
        } catch {
          console.warn(`    Skipped duplicate or invalid: ${value.code}`);
          skipped++;
        }
      }
    }

    console.log(`    Progress: ${Math.min(i + batchSize, services.length)}/${services.length}`);
  }

  return { inserted, skipped };
}

async function main() {
  const args = parseArgs();
  const jsonOutput = getBooleanArg(args, "json");
  const clearExisting = getBooleanArg(args, "clear");

  // Default CSV path: pass via --file=path/to/file.csv
  const fileArg = typeof args.file === "string" ? args.file : undefined;
  const csvPath = fileArg || resolve(__dirname, "services.csv");

  const companyId = typeof args["company-id"] === "string" ? args["company-id"] : undefined;
  if (!companyId) {
    console.error("Error: --company-id is required");
    process.exit(1);
  }

  console.log("");
  console.log("Seeding services from CSV...");
  console.log(`    CSV file: ${csvPath}`);
  console.log(`    Clear existing: ${clearExisting}`);
  console.log(`    Company ID: ${companyId}`);
  console.log("");

  try {
    const result = await seedServices(csvPath, clearExisting, companyId);

    if (jsonOutput) {
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
    } else {
      console.log("");
      console.log(`Done! Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
    }

    process.exit(0);
  } catch (error) {
    if (jsonOutput) {
      console.log(JSON.stringify({ success: false, error: String(error) }, null, 2));
    } else {
      console.error("");
      console.error("Error seeding services:", error);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
