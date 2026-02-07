import { cookies } from "next/headers";
import { getPreferencesFromCookies } from "@/lib/preferences/preferences.server";
import { PreferencesClient } from "./preferences-client";

/**
 * Preferences Page (Server Component)
 *
 * Reads preference cookies on the server and passes them to the client component
 * for SSR hydration match.
 */
export default async function PreferencesPage() {
  const [initialPreferences, cookieStore] = await Promise.all([
    getPreferencesFromCookies(),
    cookies(),
  ]);

  // Read theme from next-themes cookie for SSR
  const initialTheme = cookieStore.get("pref.theme")?.value ?? "system";

  return <PreferencesClient initialPreferences={initialPreferences} initialTheme={initialTheme} />;
}
