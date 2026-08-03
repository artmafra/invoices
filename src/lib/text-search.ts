/** Normalizes text so searches are case- and accent-insensitive. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function includesNormalizedText(value: string, search: string): boolean {
  return normalizeSearchText(value).includes(normalizeSearchText(search));
}
