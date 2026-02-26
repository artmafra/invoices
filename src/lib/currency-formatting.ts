/**
 * Brazilian Real (R$) currency utilities
 * 1 Real = 100 cents
 * Display format: R$ 1.234,56 (uses . for thousands, , for cents)
 * Stored format: cents as integer (123456 for 1234.56 reais)
 */

/**
 * Extracts numeric values from a currency string
 * Accepts both Brazilian format (1.234,56) and international format (1234.56)
 */
export function extractCurrencyDigits(value: string): string {
  // Remove R$, spaces, and any non-digit characters except comma and dot
  const cleaned = value.replace(/[^\d,.-]/g, "");

  // Determine if comma or dot is the decimal separator
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let digitsOnly: string;

  if (lastComma > lastDot) {
    // Brazilian format: 1.234,56 - comma is decimal separator
    digitsOnly = cleaned.replace(/\./g, "").replace(",", "");
  } else if (lastDot > lastComma) {
    // International format: 1,234.56 - dot is decimal separator
    digitsOnly = cleaned.replace(/,/g, "").replace(".", "");
  } else {
    // No separator, just digits
    digitsOnly = cleaned.replace(/[.,]/g, "");
  }

  return digitsOnly;
}

/**
 * Converts input value to cents
 * Accepts: "123456" (cents), "1234,56" (reais.centavos), "1234.56", "1.234,56"
 * Returns: total cents as number
 */
export function parseTocents(input: string): number {
  const digits = extractCurrencyDigits(input);

  if (!digits) return 0;

  // If less than 3 digits, it's just cents
  if (digits.length <= 2) {
    return parseInt(digits, 10);
  }

  // Last 2 digits are cents, rest are reais
  const cents = parseInt(digits.slice(-2), 10);
  const reais = parseInt(digits.slice(0, -2), 10);

  return reais * 100 + cents;
}

/**
 * Formats cents to Brazilian Real display format
 * Input: 123456 (cents)
 * Output: "R$ 1.234,56"
 */
export function formatToReais(cents: number | string): string {
  const numCents = typeof cents === "string" ? parseTocents(cents) : cents;

  if (numCents === 0) return "R$ 0,00";

  // Convert to reais and cents
  const reais = Math.floor(numCents / 100);
  const centsPart = numCents % 100;

  // Format with thousand separators (dot for thousands)
  const reaisFormatted = reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Combine with cents (using comma as decimal separator)
  return `R$ ${reaisFormatted},${centsPart.toString().padStart(2, "0")}`;
}

/**
 * Formats cents for display during typing (without R$ prefix for intermediate states)
 * Supports partial formatting as user types
 */
export function formatCentsProgressive(input: string): string {
  const digits = extractCurrencyDigits(input);

  if (!digits) return "";

  // Progressive formatting as user types
  if (digits.length === 1) {
    return `0,0${digits}`;
  }

  if (digits.length === 2) {
    return `0,${digits}`;
  }

  // Split into reais and cents
  const reais = digits.slice(0, -2);
  const cents = digits.slice(-2);

  // Add thousand separators to reais
  const reaisWithSeparators = reais.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${reaisWithSeparators},${cents}`;
}

/**
 * Get display value with R$ prefix
 */
export function getDisplayValue(cents: number | string): string {
  const formatted = formatCentsProgressive(typeof cents === "number" ? cents.toString() : cents);
  return formatted ? `R$ ${formatted}` : "R$ 0,00";
}
