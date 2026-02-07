import type { useTranslations } from "next-intl";
import type { DeviceType } from "@/types/sessions/sessions.types";
import { SearchBarFilterSelect } from "@/components/shared/search-bar";

export interface SessionsFiltersProps {
  deviceFilter: DeviceType | undefined;
  onDeviceFilterChange: (value: string) => void;
  t: ReturnType<typeof useTranslations<"system.sessions">>;
}

/**
 * Filter controls for sessions page
 * Extracts filter UI into reusable component
 */
export function SessionsFilters({ deviceFilter, onDeviceFilterChange, t }: SessionsFiltersProps) {
  return (
    <SearchBarFilterSelect
      label={t("filters.device")}
      value={deviceFilter}
      onValueChange={(v) => onDeviceFilterChange(v === undefined ? "any" : v)}
      anyLabel={t("filters.any")}
      options={[
        { value: "desktop", label: t("desktop") },
        { value: "mobile", label: t("mobile") },
        { value: "tablet", label: t("tablet") },
      ]}
    />
  );
}
