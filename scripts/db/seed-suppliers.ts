import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tableSuppliers } from "@/schema/suppliers.schema";
import type { SupplierTaxRegime } from "@/schema/suppliers.schema";
import { db } from "@/db/postgres";
import { getBooleanArg, parseArgs } from "../lib/args";

interface CsvSupplierRow {
  cnpj: string;
  name: string;
  city: string;
  taxRegime: SupplierTaxRegime;
}

function extractCnpjDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

function parseTaxRegime(raw: string): SupplierTaxRegime | null {
  const v = raw.trim().toUpperCase();
  if (v === "SN") return "sn";
  if (v === "N") return "n";
  if (v === "MEI") return "mei";
  return null;
}

function parseSuppliersFromCsv(filePath: string): CsvSupplierRow[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const suppliers: CsvSupplierRow[] = [];

  for (const line of lines) {
    // CSV columns: 0=empty, 1=CNPJ, 2=NAME, 3=CITY, 4=REGIME
    const fields = line.split(",").map((f) => f.trim());

    const rawCnpj = fields[1] ?? "";
    const cnpj = extractCnpjDigits(rawCnpj);

    // Skip header/title rows and rows without a valid 14-digit CNPJ
    if (cnpj.length !== 14) continue;

    const name = fields[2]?.trim().replace(/^"|"$/g, "").toUpperCase();
    const city = fields[3]?.trim();
    const taxRegime = parseTaxRegime(fields[4] ?? "");

    if (!name || !city || !taxRegime) {
      console.warn(`    Skipping invalid row: ${line.substring(0, 80)}`);
      continue;
    }

    suppliers.push({ cnpj, name, city, taxRegime });
  }

  return suppliers;
}

async function seedSuppliers(
  csvPath: string,
  clearExisting: boolean,
): Promise<{ inserted: number; skipped: number }> {
  const suppliers = parseSuppliersFromCsv(csvPath);
  console.log(`Parsed ${suppliers.length} suppliers from CSV`);

  if (clearExisting) {
    console.log("Clearing existing suppliers...");
    await db.delete(tableSuppliers);
    console.log("    Cleared all existing suppliers");
  }

  let inserted = 0;
  let skipped = 0;

  for (const supplier of suppliers) {
    try {
      const result = await db
        .insert(tableSuppliers)
        .values({
          cnpj: supplier.cnpj,
          name: supplier.name,
          city: supplier.city,
          taxRegime: supplier.taxRegime,
        })
        .onConflictDoNothing({ target: tableSuppliers.cnpj })
        .returning({ id: tableSuppliers.id });

      if (result.length > 0) {
        inserted++;
      } else {
        skipped++;
        console.log(`    Skipped duplicate CNPJ: ${supplier.cnpj} (${supplier.name})`);
      }
    } catch (error) {
      console.warn(`    Error inserting ${supplier.cnpj} (${supplier.name}): ${error}`);
      skipped++;
    }
  }

  return { inserted, skipped };
}

async function main() {
  const args = parseArgs();
  const jsonOutput = getBooleanArg(args, "json");
  const clearExisting = getBooleanArg(args, "clear");

  const fileArg = typeof args.file === "string" ? args.file : undefined;
  const csvPath = fileArg || resolve(__dirname, "suppliers.csv");

  console.log("");
  console.log("Seeding suppliers from CSV...");
  console.log(`    CSV file: ${csvPath}`);
  console.log(`    Clear existing: ${clearExisting}`);
  console.log("");

  try {
    const result = await seedSuppliers(csvPath, clearExisting);

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
      console.error("Error seeding suppliers:", error);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
