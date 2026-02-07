/**
 * Language Client Helper
 *
 * Provides a function to update the user's language preference,
 * syncing to the server (for email translations).
 * The locale cookie is set by the preferences provider.
 */

import { type Locale } from "@/i18n/config";

/**
 * Update language preference on the server
 * - Persists to user's DB record (used for email translations)
 *
 * @throws {Error} if server request fails
 */
export async function updateLanguageOnServer(locale: Locale): Promise<void> {
  // Sync to server (for authenticated users, used for email translations)
  const response = await fetch("/api/profile/locale", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to update language" }));
    throw new Error(error.error || "Failed to update language");
  }
}
