import type { Tag } from "@/schema/tags.schema";
import { tagStorage } from "@/storage/runtime/tag";
import { type TagFilterOptions } from "@/storage/tag.storage";
import type { PaginatedResult, PaginationOptions } from "@/storage/types";

/**
 * Tag Service
 * Business logic for managing global tags
 */
export class TagService {
  /**
   * Get tag by ID
   */
  async getById(id: string): Promise<Tag | null> {
    return (await tagStorage.findById(id)) ?? null;
  }

  /**
   * Get tag by name
   */
  async getByName(name: string): Promise<Tag | null> {
    return (await tagStorage.findByName(name)) ?? null;
  }

  /**
   * Search tags for autocomplete
   * Returns tags matching the search term, ordered by usage count
   */
  async searchForAutocomplete(searchTerm: string, limit = 10): Promise<Tag[]> {
    return tagStorage.searchTags(searchTerm, limit);
  }

  /**
   * Get all tags
   */
  async getAll(): Promise<Tag[]> {
    return tagStorage.findMany();
  }

  /**
   * Get tags with pagination
   */
  async getPaginated(
    filters?: TagFilterOptions,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Tag>> {
    return tagStorage.findManyPaginated(filters, options);
  }

  /**
   * Create a new tag
   */
  async create(data: { name: string }): Promise<Tag> {
    // Trim and validate tag name
    const trimmedName = data.name.trim();

    if (!trimmedName) {
      throw new Error("Tag name cannot be empty");
    }

    if (trimmedName.length > 50) {
      throw new Error("Tag name cannot exceed 50 characters");
    }

    return tagStorage.create({ name: trimmedName });
  }

  /**
   * Find or create tag by name
   * Used when user creates a tag inline during note creation/editing
   */
  async findOrCreate(name: string): Promise<Tag> {
    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new Error("Tag name cannot be empty");
    }

    if (trimmedName.length > 50) {
      throw new Error("Tag name cannot exceed 50 characters");
    }

    return tagStorage.findOrCreate(trimmedName);
  }

  /**
   * Update tag by ID
   */
  async update(id: string, data: { name: string }): Promise<Tag | null> {
    const trimmedName = data.name.trim();

    if (!trimmedName) {
      throw new Error("Tag name cannot be empty");
    }

    if (trimmedName.length > 50) {
      throw new Error("Tag name cannot exceed 50 characters");
    }

    return (await tagStorage.update(id, { name: trimmedName })) ?? null;
  }

  /**
   * Delete tag by ID
   * Note: CASCADE will automatically remove all note associations
   */
  async delete(id: string): Promise<boolean> {
    return tagStorage.delete(id);
  }

  /**
   * Get tags for a specific note
   */
  async getTagsForNote(noteId: string): Promise<Tag[]> {
    return tagStorage.getTagsForNote(noteId);
  }

  /**
   * Set tags for a note (replaces existing tags)
   * Automatically creates new tags if they don't exist
   *
   * @param noteId - Note ID
   * @param tagNames - Array of tag names (max 5)
   */
  async setTagsForNote(noteId: string, tagNames: string[]): Promise<Tag[]> {
    // Validate max 5 tags
    if (tagNames.length > 5) {
      throw new Error("Maximum 5 tags allowed per note");
    }

    // Trim and deduplicate tag names
    const uniqueTagNames = Array.from(
      new Set(tagNames.map((name) => name.trim()).filter((name) => name.length > 0)),
    );

    // Find or create all tags
    const tags: Tag[] = [];
    for (const tagName of uniqueTagNames) {
      const tag = await this.findOrCreate(tagName);
      tags.push(tag);
    }

    // Set tags for note
    const tagIds = tags.map((tag) => tag.id);
    await tagStorage.setTagsForNote(noteId, tagIds);

    return tags;
  }

  /**
   * Add tag to note
   */
  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    return tagStorage.addTagToNote(noteId, tagId);
  }

  /**
   * Remove tag from note
   */
  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    return tagStorage.removeTagFromNote(noteId, tagId);
  }

  /**
   * Remove all tags from a note
   */
  async removeAllTagsFromNote(noteId: string): Promise<void> {
    return tagStorage.removeAllTagsFromNote(noteId);
  }

  /**
   * Delete orphaned tags (tags not associated with any notes)
   * Called automatically when a note is deleted
   */
  async deleteOrphanedTags(): Promise<number> {
    return tagStorage.deleteOrphanedTags();
  }

  /**
   * Get tag usage statistics
   */
  async getTagStats(): Promise<{ tag: Tag; usageCount: number }[]> {
    return tagStorage.getTagStats();
  }
}

export const tagService = new TagService();
