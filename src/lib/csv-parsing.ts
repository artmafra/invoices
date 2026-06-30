/**
 * Parse a CSV line respecting double-quoted fields (RFC 4180-style).
 * Handles escaped quotes ("") inside quoted fields.
 */
export function parseCsvLine(line: string, separator: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
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

/**
 * Parse a tax rate cell value from a CSV (e.g. "1,00%", "4,65%") into a number.
 * Returns null for non-taxed values: empty, "NT", or art-reference strings.
 */
export function parseCsvTaxRate(value: string): number | null {
  const trimmed = value.trim().toUpperCase();

  if (!trimmed || trimmed === "NT" || trimmed.startsWith("ART")) return null;

  const cleaned = trimmed.replace("%", "").replace(",", ".").trim();
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : num;
}
