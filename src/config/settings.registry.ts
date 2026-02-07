/**
 * Settings Registry
 *
 * Central definition for all application settings with TypeScript type safety.
 * This file is the single source of truth for setting keys, types, and defaults.
 */

// =============================================================================
// Setting Type Definitions
// =============================================================================

export const SETTING_TYPES = ["string", "boolean", "number", "json", "image", "select"] as const;
export type SettingType = (typeof SETTING_TYPES)[number];

export const SETTING_SCOPES = ["public", "system"] as const;
export type SettingScope = (typeof SETTING_SCOPES)[number];

export const SETTING_CATEGORIES = [
  "branding",
  "contact",
  "social",
  "seo",
  "email",
  "general",
  "security",
] as const;
export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

// =============================================================================
// Setting Definition Interface
// =============================================================================

interface BaseSettingDefinition<K extends string, T extends SettingType, S extends SettingScope> {
  key: K;
  label: string;
  type: T;
  defaultValue: string;
  description: string;
  category: SettingCategory;
  scope: S;
  /** If true, setting is hidden from non-system users (e.g., OAuth tokens, API keys) */
  sensitive?: boolean;
}

interface SelectSettingDefinition<
  K extends string,
  S extends SettingScope,
> extends BaseSettingDefinition<K, "select", S> {
  options: string[];
}

interface JsonSettingDefinition<
  K extends string,
  S extends SettingScope,
  V,
> extends BaseSettingDefinition<K, "json", S> {
  jsonType: V;
  sensitive?: boolean;
}

type _SettingDefinition<
  K extends string,
  T extends SettingType,
  S extends SettingScope,
> = T extends "select"
  ? SelectSettingDefinition<K, S>
  : T extends "json"
    ? JsonSettingDefinition<K, S, unknown>
    : BaseSettingDefinition<K, T, S>;

// =============================================================================
// Helper Functions for Creating Settings
// =============================================================================

function defineStringSetting<K extends string, S extends SettingScope>(
  key: K,
  config: Omit<BaseSettingDefinition<K, "string", S>, "key" | "type">,
): BaseSettingDefinition<K, "string", S> {
  return { key, type: "string", ...config };
}

function defineBooleanSetting<K extends string, S extends SettingScope>(
  key: K,
  config: Omit<BaseSettingDefinition<K, "boolean", S>, "key" | "type">,
): BaseSettingDefinition<K, "boolean", S> {
  return { key, type: "boolean", ...config };
}

function defineNumberSetting<K extends string, S extends SettingScope>(
  key: K,
  config: Omit<BaseSettingDefinition<K, "number", S>, "key" | "type">,
): BaseSettingDefinition<K, "number", S> {
  return { key, type: "number", ...config };
}

function defineImageSetting<K extends string, S extends SettingScope>(
  key: K,
  config: Omit<BaseSettingDefinition<K, "image", S>, "key" | "type">,
): BaseSettingDefinition<K, "image", S> {
  return { key, type: "image", ...config };
}

function defineSelectSetting<K extends string, S extends SettingScope>(
  key: K,
  config: Omit<SelectSettingDefinition<K, S>, "key" | "type">,
): SelectSettingDefinition<K, S> {
  return { key, type: "select", ...config };
}

// =============================================================================
// Settings Registry Definition
// =============================================================================

export const SETTINGS_REGISTRY = [
  // -------------------------------------------------------------------------
  // Branding Settings (Public)
  // -------------------------------------------------------------------------
  defineImageSetting("header_image", {
    label: "Header Image",
    defaultValue: "",
    description: "URL of the header image displayed on the homepage",
    category: "branding",
    scope: "public",
  }),
  defineStringSetting("footer_text", {
    label: "Footer Text",
    defaultValue: "© {year} Template Inc. All rights reserved.",
    description: "Custom footer text. Use {year} for dynamic year.",
    category: "branding",
    scope: "public",
  }),
  defineStringSetting("hero_title", {
    label: "Hero Title",
    defaultValue: "Build Something Amazing",
    description: "Main heading displayed on the homepage hero section",
    category: "branding",
    scope: "public",
  }),
  defineStringSetting("hero_description", {
    label: "Hero Description",
    defaultValue: "A modern full-stack template to kickstart your next project.",
    description: "Subtitle text displayed below the hero title",
    category: "branding",
    scope: "public",
  }),

  // -------------------------------------------------------------------------
  // Contact Information (Public)
  // -------------------------------------------------------------------------
  defineStringSetting("contact_phone", {
    label: "Contact Phone",
    defaultValue: "(555) 123-4567",
    description: "Main phone number for customer contact",
    category: "contact",
    scope: "public",
  }),
  defineStringSetting("contact_email", {
    label: "Contact Email",
    defaultValue: "hello@template.com",
    description: "Main email address for customer contact",
    category: "contact",
    scope: "public",
  }),
  defineStringSetting("business_address", {
    label: "Business Address",
    defaultValue: "123 Template Street, Template City, TC 12345",
    description: "Physical address of the business",
    category: "contact",
    scope: "public",
  }),

  // -------------------------------------------------------------------------
  // Social Media (Public)
  // -------------------------------------------------------------------------
  defineStringSetting("facebook_url", {
    label: "Facebook URL",
    defaultValue: "",
    description: "Link to your website's Facebook page",
    category: "social",
    scope: "public",
  }),
  defineStringSetting("twitter_url", {
    label: "Twitter/X URL",
    defaultValue: "",
    description: "Link to your website's Twitter/X profile",
    category: "social",
    scope: "public",
  }),
  defineStringSetting("linkedin_url", {
    label: "LinkedIn URL",
    defaultValue: "",
    description: "Link to your website's LinkedIn page",
    category: "social",
    scope: "public",
  }),
  defineStringSetting("youtube_url", {
    label: "YouTube URL",
    defaultValue: "",
    description: "Link to your website's YouTube channel",
    category: "social",
    scope: "public",
  }),

  // -------------------------------------------------------------------------
  // SEO Settings (System - Admin only)
  // -------------------------------------------------------------------------
  defineStringSetting("google_analytics_id", {
    label: "Google Analytics ID",
    defaultValue: "",
    description: "Google Analytics tracking ID (GA4)",
    category: "seo",
    scope: "system",
  }),

  // -------------------------------------------------------------------------
  // Email Settings (System)
  // -------------------------------------------------------------------------
  defineStringSetting("email_from_name", {
    label: "Email From Name",
    defaultValue: "Template Inc.",
    description: "Display name for outgoing emails",
    category: "email",
    scope: "system",
  }),
  defineSelectSetting("default_language", {
    label: "Default Language",
    defaultValue: "en-US",
    description:
      "Default language for emails when user preference is not available. Falls back to Accept-Language header first.",
    category: "email",
    scope: "system",
    options: ["en-US", "pt-BR"],
  }),

  // -------------------------------------------------------------------------
  // General Settings (System)
  // -------------------------------------------------------------------------
  defineSelectSetting("timezone", {
    label: "Timezone",
    defaultValue: "America/New_York",
    description: "Default timezone for the website",
    category: "general",
    scope: "system",
    options: [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "America/Toronto",
      "America/Vancouver",
      "America/Mexico_City",
      "America/Sao_Paulo",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Madrid",
      "Europe/Rome",
      "Europe/Amsterdam",
      "Europe/Moscow",
      "Asia/Dubai",
      "Asia/Kolkata",
      "Asia/Bangkok",
      "Asia/Singapore",
      "Asia/Hong_Kong",
      "Asia/Shanghai",
      "Asia/Tokyo",
      "Asia/Seoul",
      "Australia/Sydney",
      "Australia/Melbourne",
      "Australia/Perth",
      "Pacific/Auckland",
      "Pacific/Honolulu",
      "UTC",
    ],
  }),
  defineBooleanSetting("maintenance_mode", {
    label: "Maintenance Mode",
    defaultValue: "false",
    description: "Enable maintenance mode to temporarily disable the site",
    category: "general",
    scope: "system",
  }),

  // -------------------------------------------------------------------------
  // Security Settings (System)
  // -------------------------------------------------------------------------
  defineNumberSetting("password_min_length", {
    label: "Minimum Password Length",
    defaultValue: "8",
    description: "Minimum number of characters required for passwords",
    category: "security",
    scope: "system",
  }),
  defineBooleanSetting("password_require_uppercase", {
    label: "Require Uppercase Letter",
    defaultValue: "true",
    description: "Require at least one uppercase letter in passwords",
    category: "security",
    scope: "system",
  }),
  defineBooleanSetting("password_require_lowercase", {
    label: "Require Lowercase Letter",
    defaultValue: "true",
    description: "Require at least one lowercase letter in passwords",
    category: "security",
    scope: "system",
  }),
  defineBooleanSetting("password_require_number", {
    label: "Require Number",
    defaultValue: "true",
    description: "Require at least one number in passwords",
    category: "security",
    scope: "system",
  }),
  defineBooleanSetting("password_require_special", {
    label: "Require Special Character",
    defaultValue: "false",
    description: "Require at least one special character (!@#$%^&*) in passwords",
    category: "security",
    scope: "system",
  }),
] as const;

// =============================================================================
// Type Exports
// =============================================================================

/** Union type of all setting keys */
export type SettingKey = (typeof SETTINGS_REGISTRY)[number]["key"];

/** Extract setting definition by key */
type SettingByKey<K extends SettingKey> = Extract<(typeof SETTINGS_REGISTRY)[number], { key: K }>;

/** Extract public setting keys */
export type PublicSettingKey = Extract<
  (typeof SETTINGS_REGISTRY)[number],
  { scope: "public" }
>["key"];

/** Extract system setting keys */
export type SystemSettingKey = Extract<
  (typeof SETTINGS_REGISTRY)[number],
  { scope: "system" }
>["key"];

/** Map setting type to TypeScript value type */
type SettingValueTypeMap = {
  string: string;
  boolean: boolean;
  number: number;
  image: string;
  select: string;
  json: unknown;
};

/** Get the value type for a specific setting key */
export type SettingValueType<K extends SettingKey> = SettingByKey<K>["type"] extends "json"
  ? SettingByKey<K> extends { jsonType: infer V }
    ? V
    : unknown
  : SettingValueTypeMap[SettingByKey<K>["type"]];

// =============================================================================
// Runtime Utilities
// =============================================================================

/** Get setting definition by key */
export function getSettingDefinition<K extends SettingKey>(key: K): SettingByKey<K> | undefined {
  return SETTINGS_REGISTRY.find((s) => s.key === key) as SettingByKey<K> | undefined;
}

/** Get default value for a setting */
export function getSettingDefault<K extends SettingKey>(key: K): string {
  const setting = getSettingDefinition(key);
  return setting?.defaultValue ?? "";
}

/** Check if a setting key is valid */
export function isValidSettingKey(key: string): key is SettingKey {
  return SETTINGS_REGISTRY.some((s) => s.key === key);
}

/** Check if a setting is marked as sensitive (hidden from non-system users) */
export function isSensitiveSetting(key: string): boolean {
  const setting = SETTINGS_REGISTRY.find((s) => s.key === key);
  return setting?.sensitive === true;
}

/** Get all settings for a scope */
export function getSettingsByScope(scope: SettingScope) {
  return SETTINGS_REGISTRY.filter((s) => s.scope === scope);
}

/** Get all public setting keys */
export function getPublicSettingKeys(): PublicSettingKey[] {
  return SETTINGS_REGISTRY.filter((s) => s.scope === "public").map(
    (s) => s.key,
  ) as PublicSettingKey[];
}

/** Get all system setting keys */
export function getSystemSettingKeys(): SystemSettingKey[] {
  return SETTINGS_REGISTRY.filter((s) => s.scope === "system").map(
    (s) => s.key,
  ) as SystemSettingKey[];
}

/** Parse a setting value based on its type */
export function parseSettingValue<K extends SettingKey>(
  key: K,
  value: string | null,
): SettingValueType<K> | null {
  if (value === null || value === "") return null;

  const setting = getSettingDefinition(key);
  if (!setting) return null;

  const settingType = setting.type as SettingType;

  switch (settingType) {
    case "boolean":
      return (value === "true") as SettingValueType<K>;
    case "json":
      try {
        return JSON.parse(value) as SettingValueType<K>;
      } catch {
        return null;
      }
    default:
      return value as SettingValueType<K>;
  }
}

/** Serialize a setting value to string for storage */
export function serializeSettingValue<K extends SettingKey>(
  key: K,
  value: SettingValueType<K>,
): string {
  const setting = getSettingDefinition(key);
  if (!setting) return String(value);

  const settingType = setting.type as SettingType;

  switch (settingType) {
    case "boolean":
      return String(value);
    case "json":
      return JSON.stringify(value);
    default:
      return String(value);
  }
}
