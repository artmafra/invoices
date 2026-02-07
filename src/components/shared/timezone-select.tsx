"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Get major IANA timezones grouped by region with UTC offset labels.
 * Curated list of important cities/timezones per continent.
 */
function getTimezones(): { value: string; label: string; region: string }[] {
  const now = new Date();

  // Curated list of major timezones by continent
  const majorTimezones = [
    // UTC
    "UTC",
    // America (North)
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "America/Halifax",
    "America/Toronto",
    "America/Vancouver",
    // America (Central/South)
    "America/Mexico_City",
    "America/Bogota",
    "America/Lima",
    "America/Santiago",
    "America/Buenos_Aires",
    "America/Sao_Paulo",
    // Europe
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Rome",
    "Europe/Madrid",
    "Europe/Amsterdam",
    "Europe/Brussels",
    "Europe/Vienna",
    "Europe/Warsaw",
    "Europe/Athens",
    "Europe/Helsinki",
    "Europe/Stockholm",
    "Europe/Oslo",
    "Europe/Moscow",
    "Europe/Istanbul",
    // Asia
    "Asia/Dubai",
    "Asia/Karachi",
    "Asia/Kolkata",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Hong_Kong",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Jakarta",
    "Asia/Manila",
    "Asia/Taipei",
    // Africa
    "Africa/Cairo",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Nairobi",
    "Africa/Casablanca",
    // Australia & Pacific
    "Australia/Sydney",
    "Australia/Melbourne",
    "Australia/Brisbane",
    "Australia/Perth",
    "Pacific/Auckland",
    "Pacific/Fiji",
    "Pacific/Honolulu",
  ];

  return majorTimezones.map((tz) => {
    // Get UTC offset for this timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    const offset = offsetPart?.value ?? "";

    // Extract region from timezone (e.g., "America/New_York" -> "America")
    const region = tz.split("/")[0];

    // Create readable label (e.g., "America/New_York" -> "New York")
    const city = tz.split("/").slice(1).join("/").replace(/_/g, " ");
    const label = `(${offset}) ${city || tz}`;

    return { value: tz, label, region };
  });
}

/**
 * Group timezones by region for organized display
 */
function groupTimezonesByRegion(
  timezones: { value: string; label: string; region: string }[],
): Map<string, { value: string; label: string }[]> {
  const groups = new Map<string, { value: string; label: string }[]>();

  // Define region order for better UX
  const regionOrder = [
    "UTC",
    "America",
    "Europe",
    "Asia",
    "Africa",
    "Australia",
    "Pacific",
    "Atlantic",
    "Indian",
    "Antarctica",
    "Arctic",
    "Etc",
  ];

  // Initialize groups in order
  for (const region of regionOrder) {
    groups.set(region, []);
  }

  // Sort timezones by offset within each region
  const sortedTimezones = [...timezones].sort((a, b) => {
    // Extract offset number for sorting (e.g., "GMT-5" -> -5)
    const getOffsetNum = (label: string) => {
      const match = label.match(/GMT([+-]?\d+(?::\d+)?)/);
      if (!match) return 0;
      const [hours, mins = "0"] = match[1].split(":");
      return parseInt(hours) * 60 + (parseInt(hours) < 0 ? -1 : 1) * parseInt(mins);
    };
    return getOffsetNum(a.label) - getOffsetNum(b.label);
  });

  // Add UTC as a special entry at the top
  groups.set("UTC", [{ value: "UTC", label: "(UTC+0) Coordinated Universal Time" }]);

  // Group timezones
  for (const tz of sortedTimezones) {
    if (tz.value === "UTC") continue; // Skip UTC, we added it manually

    const region = tz.region;
    if (!groups.has(region)) {
      groups.set(region, []);
    }
    groups.get(region)!.push({ value: tz.value, label: tz.label });
  }

  // Remove empty groups
  for (const [key, value] of groups) {
    if (value.length === 0) {
      groups.delete(key);
    }
  }

  return groups;
}

interface TimezoneSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TimezoneSelect({
  value,
  onValueChange,
  disabled = false,
  className,
}: TimezoneSelectProps) {
  const t = useTranslations("profile.preferences");
  const [open, setOpen] = useState(false);

  // Memoize timezone data (expensive to compute)
  const timezones = useMemo(() => getTimezones(), []);
  const groupedTimezones = useMemo(() => groupTimezonesByRegion(timezones), [timezones]);

  // Find current selection label
  const selectedLabel = useMemo(() => {
    if (value === "UTC") return "(UTC+0) Coordinated Universal Time";
    const tz = timezones.find((tz) => tz.value === value);
    return tz?.label ?? value;
  }, [timezones, value]);

  // Custom filter function to prioritize exact city name matches
  const filterTimezones = (value: string, search: string) => {
    const searchLower = search.toLowerCase();
    const valueLower = value.toLowerCase();

    // Extract city name from the value (format: "Region/City (offset) City Name")
    const cityMatch = valueLower.match(/\)\s+(.+)$/);
    const cityName = cityMatch ? cityMatch[1] : "";

    // Priority 1: City name starts with search term (highest score)
    if (cityName.startsWith(searchLower)) {
      return 1;
    }

    // Priority 2: City name contains the search term
    if (cityName.includes(searchLower)) {
      return 0.8;
    }

    // Priority 3: Full value contains search term (timezone ID or offset)
    if (valueLower.includes(searchLower)) {
      return 0.5;
    }

    // No match
    return 0;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="select"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between cursor-default", className)}
        >
          <div className="flex items-center gap-space-sm truncate">
            <Clock className="size-4 shrink-0" />
            <span className="truncate">{selectedLabel}</span>
          </div>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-87.5 p-0" align="start">
        <Command filter={filterTimezones}>
          <CommandInput placeholder={t("timezone.search")} />
          <CommandList>
            <CommandEmpty>{t("timezone.noResults")}</CommandEmpty>
            {Array.from(groupedTimezones.entries()).map(([region, tzList]) => (
              <CommandGroup key={region} heading={region}>
                {tzList.map((tz) => (
                  <CommandItem
                    key={tz.value}
                    value={`${tz.value} ${tz.label}`}
                    onSelect={() => {
                      onValueChange(tz.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-space-sm size-4",
                        value === tz.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{tz.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
