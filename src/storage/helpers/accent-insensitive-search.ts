import { sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { normalizeSearchText } from "@/lib/text-search";

const ACCENTED_CHARACTERS =
  "\u00e1\u00e0\u00e2\u00e3\u00e4\u00e5\u00e9\u00e8\u00ea\u00eb\u00ed\u00ec\u00ee\u00ef\u00f3\u00f2\u00f4\u00f5\u00f6\u00fa\u00f9\u00fb\u00fc\u00e7\u00f1\u00fd\u00ff";
const UNACCENTED_CHARACTERS = "aaaaaaeeeeiiiiooooouuuucnyy";

/**
 * Builds a case- and accent-insensitive LIKE condition without requiring the
 * optional PostgreSQL `unaccent` extension.
 */
export function accentInsensitiveIlike(column: SQLWrapper, value: string): SQL {
  const normalizedValue = normalizeSearchText(value);

  return sql`translate(lower(${column}), ${ACCENTED_CHARACTERS}, ${UNACCENTED_CHARACTERS}) like ${normalizedValue}`;
}
