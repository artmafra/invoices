"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useListFilters } from "./use-list-filters";

/**
 * Hook to manage games list filters with URL persistence and debounced search
 */
export function useGamesFilters() {
  const t = useTranslations("apps/games");
  const tc = useTranslations("common");

  const sortOptions = useMemo(
    () => [
      { value: "name", label: t("fields.name") },
      { value: "rating", label: t("fields.rating") },
      { value: "createdAt", label: tc("table.createdAt") },
      { value: "updatedAt", label: tc("table.updatedAt") },
    ],
    [t, tc],
  );

  const result = useListFilters({
    filterKeys: ["played", "multiplayer", "minRating"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    sortOptions,
  });

  // Parse filter values from URL state
  type PlayedFilter = "all" | "played" | "not_played" | "dropped";
  type MultiplayerFilter = "all" | "functional" | "not_functional";

  const playedFilter = ((result.filters.played as string) || "all") as PlayedFilter;
  const multiplayerFilter = ((result.filters.multiplayer as string) || "all") as MultiplayerFilter;
  const minRating = parseInt((result.filters.minRating as string) || "0", 10);

  // Convert filter values for query
  const playedValue =
    playedFilter === "played"
      ? true
      : playedFilter === "not_played"
        ? false
        : playedFilter === "dropped"
          ? "dropped"
          : undefined;

  const multiplayerValue =
    multiplayerFilter === "functional"
      ? true
      : multiplayerFilter === "not_functional"
        ? false
        : undefined;

  return {
    ...result,
    filters: {
      ...result.filters,
      played: playedValue,
      multiplayer: multiplayerValue,
      minRating: minRating > 0 ? minRating : undefined,
    },
    playedFilter,
    multiplayerFilter,
    minRating,
    setPlayedFilter: (value: string) =>
      result.setFilter("played", value === "all" ? undefined : value),
    setMultiplayerFilter: (value: string) =>
      result.setFilter("multiplayer", value === "all" ? undefined : value),
    setMinRating: (value: string) =>
      result.setFilter("minRating", value === "0" ? undefined : value),
  };
}
