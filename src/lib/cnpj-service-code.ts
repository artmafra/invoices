/**
 * CNPJ (Cadastro Nacional da Pessoa Jurídica) utilities
 * Format: XX.XXX.XXX/XXXX-XX (14 digits total)
 */

/**
 * Extracts only digits from a CNPJ string
 */
export function extractCnpjDigits(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

/**
 * Formats a CNPJ string to the standard format: XX.XXX.XXX/XXXX-XX
 * Supports partial formatting as user types
 * Accepts both formatted and unformatted input
 */
export function formatCnpj(cnpj: string): string {
  const digits = extractCnpjDigits(cnpj);
  if (digits.length === 0) return "";

  // Format progressively as user types
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Validates if a CNPJ has exactly 14 digits
 */
export function isValidCnpjLength(cnpj: string): boolean {
  const digits = extractCnpjDigits(cnpj);
  return digits.length === 14;
}

/**
 * Performs basic CNPJ checksum validation (mod 11)
 * This is more robust than length check alone
 */
export function isValidCnpjChecksum(cnpj: string): boolean {
  const digits = extractCnpjDigits(cnpj);

  if (digits.length !== 14) return false;

  // Reject sequences of repeated digits
  if (/^(\d)\1{13}$/.test(digits)) return false;

  // Calculate first check digit
  let sum = 0;
  let multiplier = 5;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }

  let remainder = sum % 11;
  const firstCheckDigit = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(digits[8]) !== firstCheckDigit) return false;

  // Calculate second check digit
  sum = 0;
  multiplier = 6;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }

  remainder = sum % 11;
  const secondCheckDigit = remainder < 2 ? 0 : 11 - remainder;

  return parseInt(digits[9]) === secondCheckDigit;
}

/**
 * Service Code (CNAE - Classificação Nacional de Atividades Econômicas) utilities
 * Format: XXXX-X/XX (4 digits, dash, 1 digit, slash, 2 digits)
 */

/**
 * Extracts only alphanumeric characters from a service code string
 */
export function extractServiceCodeCharacters(code: string): string {
  return code.replace(/\D/g, "");
}

/**
 * Formats a service code to the standard format: XXXX-X/XX
 * Supports partial formatting as user types
 * Accepts both formatted and unformatted input
 */
export function formatServiceCode(code: string): string {
  const chars = extractServiceCodeCharacters(code);
  if (chars.length === 0) return "";

  // Format progressively as user types
  if (chars.length <= 4) return chars;
  if (chars.length <= 5) return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  return `${chars.slice(0, 4)}-${chars.slice(4, 5)}/${chars.slice(5)}`;
}

/**
 * Validates if a service code has exactly 7 digits and matches the expected format
 */
export function isValidServiceCodeLength(code: string): boolean {
  const chars = extractServiceCodeCharacters(code);
  return chars.length === 7 && /^\d{7}$/.test(chars);
}

/**
 * Validates if a service code matches the CNAE format: XXXX-X/XX
 */
export function isValidServiceCodeFormat(code: string): boolean {
  // Accept both formatted and unformatted
  const chars = extractServiceCodeCharacters(code);
  if (chars.length !== 7) return false;

  // All must be digits
  return /^\d{7}$/.test(chars);
}
