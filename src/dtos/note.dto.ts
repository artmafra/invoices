import type { Note } from "@/schema/notes.schema";
import type { AdminNoteResponse, AdminNotesListResponse } from "@/types/notes/notes.types";
import type { NoteWithCreator } from "@/storage/note.storage";
import type { PaginatedResult } from "@/storage/types";
import { transformPaginatedResult } from "./base-dto.helper";

/**
 * Note DTO
 * Transforms raw Note entities to API response shapes
 */
export class NoteDTO {
  /**
   * Transform raw Note entity to admin API response
   */
  static toAdminResponse(note: Note): Omit<AdminNoteResponse, "createdBy" | "updatedBy" | "tags"> {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
      isPinned: note.isPinned,
      isArchived: note.isArchived,
      createdById: note.createdById,
      updatedById: note.updatedById,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  /**
   * Transform NoteWithCreator to detailed admin response
   */
  static toAdminDetailResponse(note: NoteWithCreator): AdminNoteResponse {
    return {
      ...this.toAdminResponse(note),
      createdBy: note.createdBy,
      updatedBy: note.updatedBy,
      tags: note.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: null, // Tags don't have color in schema, default to null
      })),
    };
  }

  /**
   * Transform paginated result to admin list response
   */
  static toPaginatedResponse(result: PaginatedResult<NoteWithCreator>): AdminNotesListResponse {
    return transformPaginatedResult(result, (note) => this.toAdminDetailResponse(note));
  }
}
