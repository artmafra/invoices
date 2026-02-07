/**
 * Email Translations Loader
 *
 * Loads locale-specific translations for email templates.
 * Used by email-sending services to get translated strings.
 */

import { defaultLocale, isValidLocale, type Locale } from "@/i18n/config";
import { settingsService } from "@/services/runtime/settings";

// Type definitions for email translations
export interface EmailCommonTranslations {
  hiName: string;
  hello: string;
  footer: string;
  unsubscribe: string;
  support: string;
  securityTip: string;
  helpCenter: string;
}

export interface WelcomeEmailTranslations {
  subject: string;
  preview: string;
  greeting: string;
  body: string;
  button: string;
  footer: string;
}

export interface PasswordResetEmailTranslations {
  subject: string;
  preview: string;
  body: string;
  button: string;
  expiry: string;
  footer: string;
}

export interface InviteEmailTranslations {
  subject: string;
  preview: string;
  bodyWithInviter: string;
  body: string;
  roleDescription: string;
  instructions: string;
  button: string;
  expiryDays: string;
  footer: string;
}

export interface TwoFactorCodeEmailTranslations {
  subject: string;
  preview: string;
  body: string;
  expiry: string;
  footer: string;
}

export interface NewLoginEmailTranslations {
  subject: string;
  preview: string;
  greeting: string;
  body: string;
  time: string;
  device: string;
  browser: string;
  operatingSystem: string;
  ipAddress: string;
  location: string;
  warning: string;
}

export interface AccountLockoutEmailTranslations {
  subject: string;
  preview: string;
  greeting: string;
  body: string;
  lockedAt: string;
  duration: string;
  failedAttempts: string;
  whatToDo: string;
  notYou: string;
}

export interface EmailChangeEmailTranslations {
  subject: string;
  preview: string;
  body: string;
  codeLabel: string;
  expiry: string;
  footer: string;
}

export interface SecurityAlertTranslations {
  labels: {
    time: string;
    device: string;
    ip: string;
    info: string;
  };
  twoFactorEmailEnabled: { subject: string; preview: string; body: string };
  twoFactorEmailDisabled: { subject: string; preview: string; body: string };
  totpEnabled: { subject: string; preview: string; body: string };
  totpDisabled: { subject: string; preview: string; body: string };
  passkeyAdded: { subject: string; preview: string; body: string };
  passkeyRemoved: { subject: string; preview: string; body: string };
  passwordChanged: { subject: string; preview: string; body: string };
  emailChanged: { subject: string; preview: string; body: string };
  primaryEmailChanged: { subject: string; preview: string; body: string };
  googleLinked: { subject: string; preview: string; body: string };
  googleUnlinked: { subject: string; preview: string; body: string };
  accountDeactivated: { subject: string; preview: string; body: string };
  notYouWarning: string;
}

export interface EmailTranslations {
  common: EmailCommonTranslations;
  welcome: WelcomeEmailTranslations;
  passwordReset: PasswordResetEmailTranslations;
  invite: InviteEmailTranslations;
  twoFactorCode: TwoFactorCodeEmailTranslations;
  newLogin: NewLoginEmailTranslations;
  accountLockout: AccountLockoutEmailTranslations;
  emailChange: EmailChangeEmailTranslations;
  security: SecurityAlertTranslations;
}

/**
 * Load email translations for a specific locale
 */
export async function getEmailTranslations(locale: Locale): Promise<EmailTranslations> {
  const messages = (await import(`@/locales/${locale}/index.ts`)).default;
  return messages.emails as EmailTranslations;
}

/**
 * Simple string interpolation for translation strings.
 * Replaces {key} placeholders with values from the params object.
 */
export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

/**
 * Determine the locale for sending an email to a user.
 * Priority: user.locale → acceptLanguage → default_language setting → defaultLocale
 */
export async function resolveEmailLocale(options: {
  userLocale?: string | null;
  acceptLanguage?: string | null;
}): Promise<Locale> {
  const { userLocale, acceptLanguage } = options;

  // 1. User's saved preference (from database)
  if (userLocale && isValidLocale(userLocale)) {
    return userLocale;
  }

  // 2. Accept-Language header from the request
  if (acceptLanguage) {
    const parsed = parseAcceptLanguage(acceptLanguage);
    if (parsed) {
      return parsed;
    }
  }

  // 3. Default language from settings
  try {
    const defaultLanguageSetting = await settingsService.getSettingValue("default_language");
    if (defaultLanguageSetting && isValidLocale(defaultLanguageSetting)) {
      return defaultLanguageSetting;
    }
  } catch {
    // Settings service might not be available in some contexts
  }

  // 4. Application default locale
  return defaultLocale;
}

/**
 * Parse Accept-Language header and find best matching locale.
 */
function parseAcceptLanguage(acceptLanguage: string): Locale | null {
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
