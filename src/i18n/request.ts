import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { getPreferencesFromCookies } from "@/lib/preferences/preferences.server";
import { defaultLocale, isValidLocale, LOCALE_COOKIE_NAME, type Locale } from "./config";

/** Parse Accept-Language header and find best matching locale. */
function parseAcceptLanguage(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null;

  const languages = acceptLanguage.split(",").map((lang) => {
    const [code, priority] = lang.trim().split(";q=");
    return { code: code.trim(), priority: priority ? parseFloat(priority) : 1 };
  });

  languages.sort((a, b) => b.priority - a.priority);

  for (const { code } of languages) {
    if (isValidLocale(code)) return code;
    const prefix = code.split("-")[0];
    for (const locale of ["en-US", "pt-BR"] as const) {
      if (locale.startsWith(prefix + "-") || locale === prefix) {
        return locale;
      }
    }
  }

  return null;
}

/**
 * Server-side locale detection. Priority: cookie → Accept-Language → default.
 * Locale is device-bound (persists across logout/impersonation).
 */
export default getRequestConfig(async () => {
  const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);

  let locale: Locale = defaultLocale;
  let localeSource: "cookie" | "header" | "default" = "default";

  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    locale = cookieLocale;
    localeSource = "cookie";
  } else {
    const acceptLanguage = headersList.get("Accept-Language");
    const headerLocale = parseAcceptLanguage(acceptLanguage);
    if (headerLocale) {
      locale = headerLocale;
      localeSource = "header";
    }
  }

  const preferences = await getPreferencesFromCookies();
  const timeZone = preferences.timezone;

  if (process.env.NODE_ENV === "development") {
    console.log(`[i18n] locale=${locale} (source=${localeSource}), timeZone=${timeZone}`);
  }

  return {
    locale,
    timeZone,
    messages: (await import(`@/locales/${locale}/index.ts`)).default,
  };
});
