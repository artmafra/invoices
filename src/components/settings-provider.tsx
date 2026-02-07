"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import type { Setting } from "@/schema/settings.schema";
import { useQuery } from "@tanstack/react-query";
import {
  getSettingDefault,
  parseSettingValue,
  type PublicSettingKey,
  type SettingKey,
  type SettingValueType,
} from "@/config/settings.registry";

interface SettingsContextValue {
  settings: Setting[];
  getSetting: (key: SettingKey) => Setting | null;
  getSettingValue: <K extends SettingKey>(
    key: K,
    defaultValue?: SettingValueType<K>,
  ) => SettingValueType<K> | null;
  getSettingsByCategory: (category: string) => Setting[];
  isLoading: boolean;
  refetch: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  children: ReactNode;
  settings: Setting[];
}

// Query key for public settings
export const SETTINGS_QUERY_KEY = ["settings", "public"];

export function SettingsProvider({ children, settings: initialSettings }: SettingsProviderProps) {
  // Use React Query with SSR initial data
  // This allows the settings to be updated when mutations invalidate the cache
  const {
    data: settings = initialSettings,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async (): Promise<Setting[]> => {
      const response = await fetch("/api/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      return response.json();
    },
    initialData: initialSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes - won't refetch unless stale or invalidated
    refetchOnWindowFocus: false, // Don't refetch on window focus for SSR stability
  });

  const value = useMemo<SettingsContextValue>(() => {
    // Create a map for O(1) lookups
    const settingsMap = new Map(settings.map((s) => [s.key, s]));

    return {
      settings,
      isLoading,
      refetch,
      getSetting: (key: SettingKey) => settingsMap.get(key) || null,
      getSettingValue: function <K extends SettingKey>(
        key: K,
        defaultValue?: SettingValueType<K>,
      ): SettingValueType<K> | null {
        const setting = settingsMap.get(key);

        if (!setting) {
          // Try registry default, then provided default
          if (defaultValue !== undefined) return defaultValue;
          const registryDefault = getSettingDefault(key);
          return parseSettingValue(key, registryDefault);
        }

        const parsed = parseSettingValue(key, setting.value);
        if (parsed === null && defaultValue !== undefined) return defaultValue;
        return parsed;
      },
      getSettingsByCategory: (category: string) => settings.filter((s) => s.category === category),
    };
  }, [settings, isLoading, refetch]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

// Convenience hooks with type inference
export function useSetting<K extends PublicSettingKey>(key: K) {
  const { getSetting } = useSettings();
  return getSetting(key);
}

export function useSettingValue<K extends PublicSettingKey>(
  key: K,
  defaultValue?: SettingValueType<K>,
): SettingValueType<K> | null {
  const { getSettingValue } = useSettings();
  return getSettingValue(key, defaultValue);
}

export function useSettingsByCategory(category: string) {
  const { getSettingsByCategory } = useSettings();
  return getSettingsByCategory(category);
}
