import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import type { PaginatedResult } from "@/storage/types";

// =============================================================================
// Types
// =============================================================================

export interface Game {
  id: string;
  name: string;
  coverImage: string | null;
  xboxStoreLink: string | null;
  rating: number;
  multiplayerFunctional: boolean;
  played: boolean;
  tried: boolean;
  dropReason: string | null;
  notes: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GameWithCreator extends Game {
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface GameFilters {
  search?: string;
  played?: boolean | "dropped";
  minRating?: number;
  multiplayerFunctional?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateGameInput {
  name: string;
  coverImage?: string | null;
  xboxStoreLink?: string | null;
  rating?: number;
  multiplayerFunctional?: boolean;
  played?: boolean;
  dropReason?: string | null;
  notes?: string | null;
}

export interface UpdateGameInput {
  name?: string;
  coverImage?: string | null;
  xboxStoreLink?: string | null;
  rating?: number;
  multiplayerFunctional?: boolean;
  played?: boolean;
  dropReason?: string | null;
  notes?: string | null;
}

// =============================================================================
// Query Keys
// =============================================================================

export const QUERY_KEYS = {
  all: ["admin", "games"] as const,
  lists: () => [...QUERY_KEYS.all, "list"] as const,
  list: (filters: GameFilters, page: number, limit: number) =>
    [...QUERY_KEYS.lists(), filters, page, limit] as const,
  detail: (gameId: string) => [...QUERY_KEYS.all, gameId] as const,
} as const;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get paginated games
 */
export const useGames = (filters: GameFilters = {}, page: number = 1, limit: number = 20) => {
  const t = useTranslations("apps/games");

  return useQuery({
    queryKey: QUERY_KEYS.list(filters, page, limit),
    queryFn: async (): Promise<PaginatedResult<GameWithCreator>> => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      if (filters.search) params.set("search", filters.search);
      if (filters.played !== undefined) params.set("played", filters.played.toString());
      if (filters.minRating !== undefined) params.set("minRating", filters.minRating.toString());
      if (filters.multiplayerFunctional !== undefined)
        params.set("multiplayerFunctional", filters.multiplayerFunctional.toString());
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

      const response = await fetch(`/api/admin/games?${params.toString()}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchFailed"));
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - mutations invalidate this
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get a single game by ID
 */
export const useGame = (gameId: string) => {
  const t = useTranslations("apps/games");

  return useQuery({
    queryKey: QUERY_KEYS.detail(gameId),
    queryFn: async (): Promise<GameWithCreator> => {
      const response = await fetch(`/api/admin/games/${gameId}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchOneFailed"));
      }

      return response.json();
    },
    enabled: !!gameId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Create a new game
 */
export const useCreateGame = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/games");

  return useMutation({
    mutationFn: async (data: CreateGameInput): Promise<Game> => {
      const response = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("hooks.createFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate game lists to show new game
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success(t("success.created"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.createFailed") });
    },
  });
};

/**
 * Update a game
 */
export const useUpdateGame = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/games");

  return useMutation({
    mutationFn: async ({
      gameId,
      data,
    }: {
      gameId: string;
      data: UpdateGameInput;
    }): Promise<Game> => {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("hooks.updateFailed"));
      }

      return result;
    },
    onSuccess: () => {
      toast.success(t("success.updated"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.updateFailed") });
    },
    onSettled: (_data, _error, variables) => {
      // Invalidate game lists and specific detail after update
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.gameId) });
    },
  });
};

/**
 * Update game rating (silent, no toast - for star rating clicks)
 */
export const useUpdateGameRating = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/games");

  return useMutation({
    mutationFn: async ({ gameId, rating }: { gameId: string; rating: number }): Promise<Game> => {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("hooks.updateFailed"));
      }

      return result;
    },
    // Optimistic update for rating changes
    onMutate: async ({ gameId, rating }) => {
      // Cancel queries for lists only (optimistic update)
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.lists() });

      const previousData = queryClient.getQueriesData({ queryKey: QUERY_KEYS.lists() });

      queryClient.setQueriesData(
        { queryKey: QUERY_KEYS.lists() },
        (old: PaginatedResult<GameWithCreator> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((game) =>
              game.id === gameId ? { ...game, rating, updatedAt: new Date().toISOString() } : game,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      handleMutationError(error, { fallback: t("hooks.updateFailed") });
    },
    onSettled: (_data, _error, variables) => {
      // Only invalidate game lists and specific detail after rating update
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.gameId) });
    },
  });
};

/**
 * Delete a game
 */
export const useDeleteGame = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/games");

  return useMutation({
    mutationFn: async (gameId: string): Promise<void> => {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw apiErrorFromResponseBody(result, t("hooks.deleteFailed"));
      }
    },
    onSuccess: () => {
      // Only invalidate game lists to remove deleted game
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success(t("success.deleted"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.deleteFailed") });
    },
  });
};

/**
 * Upload cover image for a game
 */
export const useUploadGameCover = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/games");

  return useMutation({
    mutationFn: async ({
      gameId,
      file,
    }: {
      gameId: string;
      file: File;
    }): Promise<{ url: string; fileName: string }> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/admin/games/${gameId}/cover`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("hooks.uploadFailed"));
      }

      return result;
    },
    onSuccess: (_data, variables) => {
      // Only invalidate game lists and specific detail to show new cover
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.gameId) });
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.uploadFailed") });
    },
  });
};

/**
 * Remove cover image from a game
 */
export const useRemoveGameCover = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/games");

  return useMutation({
    mutationFn: async (gameId: string): Promise<void> => {
      const response = await fetch(`/api/admin/games/${gameId}/cover`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw apiErrorFromResponseBody(result, t("hooks.removeCoverFailed"));
      }
    },
    onSuccess: (_data, gameId) => {
      // Only invalidate game lists and specific detail to remove cover
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(gameId) });
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.removeCoverFailed") });
    },
  });
};
