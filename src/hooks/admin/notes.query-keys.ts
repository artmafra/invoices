// =============================================================================
// Types
// =============================================================================

export interface NoteFilters {
  search?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  color?: string;
}

// =============================================================================
// Query Keys
// =============================================================================

export const NOTES_QUERY_KEYS = {
  all: ["admin", "notes"] as const,
  lists: () => [...NOTES_QUERY_KEYS.all, "list"] as const,
  list: (filters: NoteFilters, page: number, limit: number) =>
    [...NOTES_QUERY_KEYS.lists(), filters, page, limit] as const,
  detail: (noteId: string) => [...NOTES_QUERY_KEYS.all, noteId] as const,
} as const;
