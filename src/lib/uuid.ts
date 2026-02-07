import { v4 as uuidv4 } from "uuid";

/**
 * Generate a new UUID v4
 * @returns A new UUID string
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Validate if a string is a valid UUID
 * @param uuid The string to validate
 * @returns True if the string is a valid UUID, false otherwise
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generate a UUID v4 with a prefix for better readability in logs
 * @param prefix Optional prefix to add before the UUID
 * @returns A prefixed UUID string
 */
export function generatePrefixedUUID(prefix?: string): string {
  const uuid = uuidv4();
  return prefix ? `${prefix}_${uuid}` : uuid;
}
