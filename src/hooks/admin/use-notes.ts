import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import type { PaginatedResult } from "@/storage/types";
// Import query keys from separated file
import { NOTES_QUERY_KEYS as QUERY_KEYS } from "@/hooks/admin/notes.query-keys";

// =============================================================================
// Types
// =============================================================================

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  color: string | null;
  isArchived: boolean;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteWithCreator extends Note {
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
  tags: Tag[];
}

export interface NoteFilters {
  search?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  color?: string;
}

export interface CreateNoteInput {
  title: string;
  content: string;
  isPinned?: boolean;
  color?: string;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  isPinned?: boolean;
  color?: string | null;
  tags?: string[];
}

// Legacy export for backward compatibility
export const NOTES_QUERY_KEY = QUERY_KEYS.all;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get paginated notes
 */
export const useNotes = (filters: NoteFilters = {}, page: number = 1, limit: number = 20) => {
  const t = useTranslations("apps/notes");

  return useQuery({
    queryKey: QUERY_KEYS.list(filters, page, limit),
    queryFn: async (): Promise<PaginatedResult<NoteWithCreator>> => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      if (filters.search) params.set("search", filters.search);
      if (filters.isPinned !== undefined) params.set("isPinned", filters.isPinned.toString());
      if (filters.isArchived !== undefined) params.set("isArchived", filters.isArchived.toString());
      if (filters.color) params.set("color", filters.color);

      const response = await fetch(`/api/admin/notes?${params.toString()}`);

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
 * Get a single note by ID
 */
export const useNote = (noteId: string) => {
  const t = useTranslations("apps/notes");

  return useQuery({
    queryKey: [...NOTES_QUERY_KEY, noteId],
    queryFn: async (): Promise<NoteWithCreator> => {
      const response = await fetch(`/api/admin/notes/${noteId}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchOneFailed"));
      }

      return response.json();
    },
    enabled: !!noteId,
    staleTime: 30 * 1000,
  });
};

/**
 * Create a new note
 */
export const useCreateNote = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/notes");

  return useMutation({
    mutationFn: async (data: CreateNoteInput): Promise<Note> => {
      const response = await fetch("/api/admin/notes", {
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
      // Only invalidate note lists to show new note
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success(t("success.created"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.createFailed") });
    },
  });
};

/**
 * Update a note
 */
export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/notes");

  return useMutation({
    mutationFn: async ({
      noteId,
      data,
    }: {
      noteId: string;
      data: UpdateNoteInput;
    }): Promise<Note> => {
      const response = await fetch(`/api/admin/notes/${noteId}`, {
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
    onSuccess: (_, variables) => {
      // Only invalidate note lists to show updated data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      // Invalidate specific note detail
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.noteId) });
      toast.success(t("success.updated"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.updateFailed") });
    },
  });
};

/**
 * Delete a note
 */
export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/notes");

  return useMutation({
    mutationFn: async (noteId: string): Promise<void> => {
      const response = await fetch(`/api/admin/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw apiErrorFromResponseBody(result, t("hooks.deleteFailed"));
      }
    },
    onSuccess: () => {
      // Only invalidate note lists to remove deleted note
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success(t("success.deleted"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.deleteFailed") });
    },
  });
};

/**
 * Toggle note pin status
 */
export const useToggleNotePin = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/notes");

  return useMutation({
    mutationFn: async (noteId: string): Promise<Note> => {
      const response = await fetch(`/api/admin/notes/${noteId}/toggle-pin`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("hooks.togglePinFailed"));
      }

      return result;
    },
    onMutate: async (noteId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: QUERY_KEYS.lists() });

      // Optimistically update the cache
      queryClient.setQueriesData(
        { queryKey: QUERY_KEYS.lists() },
        (old: PaginatedResult<NoteWithCreator> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((note) =>
              note.id === noteId
                ? { ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() }
                : note,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      handleMutationError(error, { fallback: t("hooks.togglePinFailed") });
    },
    onSuccess: (data) => {
      toast.success(data.isPinned ? t("hooks.pinned") : t("hooks.unpinned"));
    },
    onSettled: () => {
      // Always invalidate after mutation completes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
    },
  });
};

/**
 * Toggle note archive status
 */
export const useArchiveNote = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/notes");

  return useMutation({
    mutationFn: async (noteId: string): Promise<Note> => {
      const response = await fetch(`/api/admin/notes/${noteId}/archive`, {
        method: "PATCH",
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(
          result,
          result.isArchived ? t("hooks.archiveFailed") : t("hooks.unarchiveFailed"),
        );
      }

      return result;
    },
    onMutate: async (noteId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: QUERY_KEYS.lists() });

      // Optimistically update the cache
      queryClient.setQueriesData(
        { queryKey: QUERY_KEYS.lists() },
        (old: PaginatedResult<NoteWithCreator> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((note) =>
              note.id === noteId
                ? { ...note, isArchived: !note.isArchived, updatedAt: new Date().toISOString() }
                : note,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      handleMutationError(error, { fallback: t("hooks.archiveFailed") });
    },
    onSuccess: (data) => {
      toast.success(data.isArchived ? t("success.archived") : t("success.unarchived"));
    },
    onSettled: () => {
      // Always invalidate after mutation completes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
    },
  });
};

/**
 * Search tags for autocomplete
 */
export const useTags = (searchTerm: string = "", limit: number = 10) => {
  const t = useTranslations("apps/notes");

  return useQuery({
    queryKey: ["admin", "tags", searchTerm, limit],
    queryFn: async (): Promise<Tag[]> => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("q", searchTerm);
      params.set("limit", limit.toString());

      const response = await fetch(`/api/admin/tags?${params.toString()}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchTagsFailed"));
      }

      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });
};
