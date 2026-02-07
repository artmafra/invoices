"use client";

import { Gamepad2, Plus } from "lucide-react";
import type { useTranslations } from "next-intl";
import { PaginationSize } from "@/lib/preferences";
import type { GameWithCreator } from "@/hooks/admin/use-games";
import type { GamePermissions } from "@/hooks/admin/use-resource-permissions";
import { GameCard } from "@/components/admin/games/game-card";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";

export interface GamesListViewProps {
  // Data
  games: GameWithCreator[];
  gamesData:
    | {
        data: GameWithCreator[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
    | undefined;

  // Pagination
  page: number;
  limit: PaginationSize;

  // Permissions
  permissions: GamePermissions;

  // Filter state
  hasActiveFilters: boolean;

  // Handlers
  onPageChange: (page: number) => void;
  onEdit: (game: GameWithCreator) => void;
  onDelete: (gameId: string) => void;
  onCreateGame: () => void;

  // Translations
  t: ReturnType<typeof useTranslations<"apps/games">>;
}

/**
 * Presentation component for games list view
 * Renders game cards with cover images, pagination, and empty states
 */
export function GamesListView({
  games,
  gamesData,
  page,
  limit,
  permissions,
  hasActiveFilters,
  onPageChange,
  onEdit,
  onDelete,
  onCreateGame,
  t,
}: GamesListViewProps) {
  return (
    <>
      {/* Games Grid */}
      {games.length === 0 ? (
        <EmptyState
          icon={Gamepad2}
          title={hasActiveFilters ? t("empty.noSearchResults") : t("empty.noGames")}
          action={{
            label: t("createButton"),
            onClick: onCreateGame,
            icon: Plus,
          }}
          showAction={!hasActiveFilters && permissions.canCreate}
        />
      ) : (
        <div className="flex flex-col gap-space-lg">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onEdit={() => onEdit(game)}
              onDelete={() => onDelete(game.id)}
              canEdit={permissions.canEdit}
              canDelete={permissions.canDelete}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {gamesData && (
        <DataPagination
          page={page}
          totalPages={gamesData.totalPages}
          total={gamesData.total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
