import { NoteDTO } from "@/dtos/note.dto";
import type { Note, NoteNew } from "@/schema/notes.schema";
import type { AdminNoteResponse, AdminNotesListResponse } from "@/types/notes/notes.types";
import { NotFoundError } from "@/lib/errors";
import { type NoteFilterOptions } from "@/storage/note.storage";
import { noteStorage } from "@/storage/runtime/note";
import type { PaginationOptions } from "@/storage/types";
import { tagService } from "@/services/tag.service";

/**
 * Note Service
 * Business logic for managing notes
 */
export class NoteService {
  /**
   * Get note by ID
   */
  async getById(id: string): Promise<Note | null> {
    return (await noteStorage.findById(id)) ?? null;
  }

  /**
   * Get note by ID with creator info (returns DTO for API)
   */
  async getByIdWithCreator(id: string): Promise<AdminNoteResponse | null> {
    const note = await noteStorage.findByIdWithCreator(id);
    return note ? NoteDTO.toAdminDetailResponse(note) : null;
  }

  /**
   * Get all notes
   */
  async getAll(filters?: NoteFilterOptions): Promise<Note[]> {
    return noteStorage.findMany(filters);
  }

  /**
   * Get notes with pagination (returns DTO for API)
   */
  async getPaginated(
    filters?: NoteFilterOptions,
    options?: PaginationOptions,
  ): Promise<AdminNotesListResponse> {
    const result = await noteStorage.findManyPaginated(filters, options);
    return NoteDTO.toPaginatedResponse(result);
  }

  /**
   * Get collection version for ETag generation.
   */
  async getCollectionVersion(filters?: NoteFilterOptions) {
    return noteStorage.getCollectionVersion(filters);
  }

  /**
   * Create a new note (returns DTO for API)
   */
  async create(data: {
    title: string;
    content: string;
    isPinned?: boolean;
    color?: string;
    tags?: string[];
    createdById: string;
  }): Promise<AdminNoteResponse> {
    // Create the note first
    const note = await noteStorage.create({
      title: data.title,
      content: data.content,
      isPinned: data.isPinned ?? false,
      color: data.color ?? null,
      createdById: data.createdById,
      updatedById: data.createdById,
    });

    // Set tags if provided
    if (data.tags && data.tags.length > 0) {
      await tagService.setTagsForNote(note.id, data.tags);
    }

    // Return note with creator info and tags
    const noteWithCreator = await noteStorage.findByIdWithCreator(note.id);
    if (!noteWithCreator) {
      throw new NotFoundError("Note", "NOTE_NOT_FOUND");
    }

    return NoteDTO.toAdminDetailResponse(noteWithCreator);
  }

  /**
   * Update a note (returns DTO for API)
   */
  async update(
    id: string,
    data: {
      title?: string;
      content?: string;
      isPinned?: boolean;
      color?: string | null;
      tags?: string[];
      updatedById: string;
    },
  ): Promise<AdminNoteResponse> {
    const updateData: Partial<NoteNew> = {
      updatedById: data.updatedById,
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
    if (data.color !== undefined) updateData.color = data.color;

    await noteStorage.update(id, updateData);

    // Update tags if provided
    if (data.tags !== undefined) {
      await tagService.setTagsForNote(id, data.tags);
    }

    // Return updated note with creator info and tags
    const noteWithCreator = await noteStorage.findByIdWithCreator(id);
    if (!noteWithCreator) {
      throw new NotFoundError("Note", "NOTE_NOT_FOUND");
    }

    return NoteDTO.toAdminDetailResponse(noteWithCreator);
  }

  /**
   * Delete a note
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await noteStorage.delete(id);

    // Clean up orphaned tags after deletion
    if (deleted) {
      await tagService.deleteOrphanedTags();
    }

    return deleted;
  }

  /**
   * Toggle pin status
   * @throws {NotFoundError} When note does not exist
   */
  async togglePin(id: string, updatedById: string): Promise<Note> {
    const note = await noteStorage.findById(id);
    if (!note) {
      throw new NotFoundError("Note", "NOTE_NOT_FOUND");
    }

    return noteStorage.update(id, {
      isPinned: !note.isPinned,
      updatedById,
    });
  }

  /**
   * Toggle archive status
   * @throws {NotFoundError} When note does not exist
   */
  async toggleArchive(id: string, updatedById: string): Promise<Note> {
    const note = await noteStorage.findById(id);
    if (!note) {
      throw new NotFoundError("Note", "NOTE_NOT_FOUND");
    }

    return noteStorage.update(id, {
      isArchived: !note.isArchived,
      updatedById,
    });
  }

  /**
   * Archive a note
   * @throws {NotFoundError} When note does not exist
   */
  async archive(id: string, updatedById: string): Promise<Note> {
    const note = await noteStorage.findById(id);
    if (!note) {
      throw new NotFoundError("Note", "NOTE_NOT_FOUND");
    }

    return noteStorage.update(id, {
      isArchived: true,
      updatedById,
    });
  }

  /**
   * Unarchive a note
   * @throws {NotFoundError} When note does not exist
   */
  async unarchive(id: string, updatedById: string): Promise<Note> {
    const note = await noteStorage.findById(id);
    if (!note) {
      throw new NotFoundError("Note", "NOTE_NOT_FOUND");
    }

    return noteStorage.update(id, {
      isArchived: false,
      updatedById,
    });
  }

  /**
   * Get pinned notes
   */
  async getPinned(): Promise<Note[]> {
    return noteStorage.findPinned();
  }

  /**
   * Get notes by creator
   */
  async getByCreator(userId: string): Promise<Note[]> {
    return noteStorage.findByCreator(userId);
  }
}
