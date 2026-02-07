"use client";

import { useCallback, useRef } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { type CreateGameInput } from "@/validations/game.validations";
import { useActionFromUrl } from "@/hooks/admin/use-action-from-url";
import {
  useCreateGame,
  useDeleteGame,
  useGames,
  useRemoveGameCover,
  useUpdateGame,
  useUploadGameCover,
  type GameFilters,
} from "@/hooks/admin/use-games";
import { useGamesDialogs } from "@/hooks/admin/use-games-dialogs";
import { useGamesFilters } from "@/hooks/admin/use-games-filters";
import { useGamePermissions } from "@/hooks/admin/use-resource-permissions";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { GamesListView } from "@/components/admin/games";
import {
  LazyGameDeleteDialog,
  LazyGameFormDialog,
} from "@/components/admin/games/lazy-games-dialogs";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { SearchBar, SearchBarFilterSelect } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { SidebarInset } from "@/components/ui/sidebar";

export function GamesPageContent() {
  const t = useTranslations("apps/games");
  const tc = useTranslations("common");
  const permissions = useGamePermissions();

  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  const limit = usePaginationSize();

  // Filters with URL persistence (Finding #9: eliminates dual state)
  const {
    filters,
    searchInput,
    sortOptions,
    animationRef,
    playedFilter,
    multiplayerFilter,
    minRating,
    setSearchInput,
    setPlayedFilter,
    setMultiplayerFilter,
    setMinRating,
    setSort,
    setPage,
    clearFilters,
    hasActiveFilters,
  } = useGamesFilters();

  // Dialog state management
  const dialogState = useGamesDialogs();
  const {
    dialogs,
    openCreateDialog,
    openEditDialog,
    closeFormDialog,
    openDeleteConfirm,
    closeDeleteConfirm,
  } = dialogState;

  // Build filters for query
  const gameFilters: GameFilters = {
    search: filters.search,
    played: filters.played as boolean | "dropped" | undefined,
    minRating: filters.minRating,
    multiplayerFunctional: filters.multiplayer,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  // Queries and mutations
  const { data, isLoading } = useGames(gameFilters, filters.page, limit);
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  const deleteGame = useDeleteGame();
  const uploadCover = useUploadGameCover();
  const removeCover = useRemoveGameCover();

  const handleSave = useCallback(
    async (data: CreateGameInput, coverFile: File | null, isCoverRemoved: boolean) => {
      if (dialogs.editingGameId) {
        await updateGame.mutateAsync({ gameId: dialogs.editingGameId, data });

        // Handle cover image upload/removal
        if (coverFile) {
          await uploadCover.mutateAsync({ gameId: dialogs.editingGameId, file: coverFile });
        } else if (isCoverRemoved) {
          await removeCover.mutateAsync(dialogs.editingGameId);
        }
      } else {
        const newGame = await createGame.mutateAsync(data);

        // Upload cover if provided
        if (coverFile) {
          await uploadCover.mutateAsync({ gameId: newGame.id, file: coverFile });
        }
      }

      closeFormDialog();
    },
    [dialogs.editingGameId, createGame, updateGame, uploadCover, removeCover, closeFormDialog],
  );

  const handleDelete = useCallback(async () => {
    if (!dialogs.deleteGameId) return;
    await deleteGame.mutateAsync(dialogs.deleteGameId);
    closeDeleteConfirm();
  }, [dialogs.deleteGameId, deleteGame, closeDeleteConfirm]);

  const isSaving = createGame.isPending || updateGame.isPending || uploadCover.isPending;

  // Handle action from URL (e.g., from command palette)
  useActionFromUrl("create", openCreateDialog);

  // Custom filters for SearchFilterBar
  const renderFilters = () => (
    <>
      <SearchBarFilterSelect
        label={t("filters.playedStatus")}
        value={playedFilter === "all" ? undefined : playedFilter}
        onValueChange={(v) => setPlayedFilter(v === undefined ? "all" : v)}
        anyLabel={t("filters.any")}
        options={[
          { value: "played", label: t("filters.played") },
          { value: "not_played", label: t("filters.notPlayed") },
          { value: "dropped", label: t("filters.dropped") },
        ]}
      />

      <SearchBarFilterSelect
        label={t("filters.multiplayer")}
        value={multiplayerFilter === "all" ? undefined : multiplayerFilter}
        onValueChange={(v) => setMultiplayerFilter(v === undefined ? "all" : v)}
        anyLabel={t("filters.any")}
        options={[
          { value: "functional", label: t("filters.mpFunctional") },
          { value: "not_functional", label: t("filters.mpNotFunctional") },
        ]}
      />

      <SearchBarFilterSelect
        label={t("filters.minRating")}
        value={minRating === 0 ? undefined : minRating.toString()}
        onValueChange={(v) => setMinRating(v === undefined ? "0" : v)}
        anyLabel={t("filters.anyRating")}
        options={[
          { value: "1", label: "★ 1+" },
          { value: "2", label: "★ 2+" },
          { value: "3", label: "★ 3+" },
          { value: "4", label: "★ 4+" },
          { value: "5", label: "★ 5" },
        ]}
      />
    </>
  );

  const editingGame = data?.data.find((g) => g.id === dialogs.editingGameId);
  const initialData: CreateGameInput | undefined = editingGame
    ? {
        name: editingGame.name,
        xboxStoreLink: editingGame.xboxStoreLink || null,
        rating: editingGame.rating,
        multiplayerFunctional: editingGame.multiplayerFunctional,
        tried: editingGame.tried,
        played: editingGame.played,
        dropReason: editingGame.dropReason || null,
        notes: editingGame.notes || null,
      }
    : undefined;

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader
          title={t("title")}
          actions={
            permissions.canCreate && (
              <Button size="sm" variant="outline" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("new")}</span>
              </Button>
            )
          }
        />
        <PageContainer>
          <PageDescription>{t("description")}</PageDescription>
          <div className="space-y-section">
            {/* Search & Filters */}
            <SearchBar
              ref={searchRef}
              searchPlaceholder={t("searchPlaceholder")}
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
              sortOptions={sortOptions}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSortChange={setSort}
            >
              {renderFilters()}
            </SearchBar>

            <LoadingTransition
              ref={animationRef}
              isLoading={isLoading && !data}
              loadingMessage={tc("loading.games")}
            >
              <GamesListView
                games={data?.data || []}
                gamesData={data}
                page={filters.page}
                limit={limit}
                permissions={permissions}
                hasActiveFilters={hasActiveFilters}
                onPageChange={setPage}
                onEdit={openEditDialog}
                onDelete={openDeleteConfirm}
                onCreateGame={openCreateDialog}
                t={t}
              />
            </LoadingTransition>
          </div>
        </PageContainer>

        {/* Create/Edit Game Dialog */}
        <LazyGameFormDialog
          open={dialogs.showFormDialog}
          onOpenChange={(open) => !open && closeFormDialog()}
          initialData={initialData}
          existingCoverUrl={dialogs.existingCoverUrl}
          onSubmit={handleSave}
          isEditing={!!dialogs.editingGameId}
          isSaving={isSaving}
          t={t}
          tc={tc}
        />

        {/* Delete Confirmation Dialog */}
        <LazyGameDeleteDialog
          open={!!dialogs.deleteGameId}
          onOpenChange={(open) => !open && closeDeleteConfirm()}
          onConfirm={handleDelete}
          isPending={deleteGame.isPending}
          t={t}
          tc={tc}
        />
      </SidebarInset>
    </ErrorBoundary>
  );
}
