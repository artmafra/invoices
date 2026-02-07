import { settingsTable } from "@/schema/settings.schema";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  SETTING_SCOPES,
  SETTING_TYPES,
  SETTINGS_REGISTRY,
  type SettingKey,
} from "@/config/settings.registry";

// Define the setting key enum from registry
const SETTING_KEYS = SETTINGS_REGISTRY.map((s) => s.key) as [SettingKey, ...SettingKey[]];
export const settingKeyEnum = z.enum(SETTING_KEYS);

// Define the setting type enum from registry
export const settingTypeEnum = z.enum(SETTING_TYPES);

// Define the setting scope enum from registry
export const settingScopeEnum = z.enum(SETTING_SCOPES);

// Database schema (what comes from DB - now with string timestamps and scope)
const baseSettingSchema = createSelectSchema(settingsTable);

// Override scope to be properly typed as enum
export const settingSchema = baseSettingSchema.extend({
  scope: settingScopeEnum,
});

export const insertSettingSchema = createInsertSchema(settingsTable, {
  type: settingTypeEnum,
  value: z.string().default(""),
  description: z.string().default(""),
  scope: settingScopeEnum.default("system"),
});

// API request/response schemas
export const getSettingsQuerySchema = z.object({
  key: settingKeyEnum.optional(),
  category: z.string().optional(),
  scope: settingScopeEnum.optional(),
  search: z.string().optional(),
});

export const createSettingSchema = z.object({
  key: settingKeyEnum,
  label: z.string().min(1).max(255),
  type: settingTypeEnum,
  options: z.array(z.string()).optional(),
  description: z.string().optional(),
  category: z.string().min(1).max(50).default("general"),
  scope: settingScopeEnum.default("system"),
  value: z.string().default(""),
});

export const updateSettingSchema = z.object({
  key: settingKeyEnum,
  label: z.string().min(1).max(255),
  type: settingTypeEnum,
  options: z.array(z.string()).optional(),
  description: z.string().optional(),
  category: z.string().min(1).max(50).default("general"),
  scope: settingScopeEnum.default("system"),
  value: z.string().default(""),
});

export const deleteSettingSchema = z.object({
  key: settingKeyEnum,
});

export const uploadImageSchema = z.object({
  file: z.instanceof(File),
  settingId: z.string().min(1),
  settingKey: settingKeyEnum,
});

// Type exports
export type GetSettingsQuery = z.infer<typeof getSettingsQuerySchema>;
export type CreateSettingRequest = z.infer<typeof createSettingSchema>;
export type UpdateSettingRequest = z.infer<typeof updateSettingSchema>;
export type DeleteSettingRequest = z.infer<typeof deleteSettingSchema>;
export type UploadImageRequest = z.infer<typeof uploadImageSchema>;
export type Setting = z.infer<typeof settingSchema>;
