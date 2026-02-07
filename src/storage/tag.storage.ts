import { noteTagsTable, tagsTable, type Tag, type TagNew } from "@/schema/tags.schema";
import { and, count, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db/postgres";
import { paginate } from "@/storage/helpers/pagination";
import type { BaseStorage, PaginatedResult, PaginationOptions } from "@/storage/types";

/**
 * Filter options for tags queries
 */
export interface TagFilterOptions {
  search?: string;
}

export class TagStorage implements BaseStorage<Tag, TagNew, Partial<TagNew>> {
  /**
   * Find tag by ID
   */
  async findById(id: string): Promise<Tag | undefined> {
    const result = await db.select().from(tagsTable).where(eq(tagsTable.id, id)).limit(1);

    return result[0];
  }

  /**
   * Find tag by name
   */
  async findByName(name: string): Promise<Tag | undefined> {
    const result = await db.select().from(tagsTable).where(eq(tagsTable.name, name)).limit(1);

    return result[0];
  }

  /**
   * Search tags by name (for autocomplete)
   * Returns tags matching the search term, ordered by usage count
   */
  async searchTags(searchTerm: string, limit = 10): Promise<Tag[]> {
    if (!searchTerm.trim()) {
      // If no search term, return most used tags
      const result = await db
        .select({
          tag: tagsTable,
          usageCount: count(noteTagsTable.noteId),
        })
        .from(tagsTable)
        .leftJoin(noteTagsTable, eq(tagsTable.id, noteTagsTable.tagId))
        .groupBy(tagsTable.id)
        .orderBy(desc(count(noteTagsTable.noteId)))
        .limit(limit);

      return result.map((r) => r.tag);
    }

    // Search by name with ILIKE
    const searchPattern = `%${searchTerm}%`;

    const result = await db
      .select({
        tag: tagsTable,
        usageCount: count(noteTagsTable.noteId),
      })
      .from(tagsTable)
      .leftJoin(noteTagsTable, eq(tagsTable.id, noteTagsTable.tagId))
      .where(ilike(tagsTable.name, searchPattern))
      .groupBy(tagsTable.id)
      .orderBy(desc(count(noteTagsTable.noteId)))
      .limit(limit);

    return result.map((r) => r.tag);
  }

  /**
   * Find all tags
   */
  async findMany(): Promise<Tag[]> {
    return db.select().from(tagsTable).orderBy(tagsTable.name);
  }

  /**
   * Find tags with pagination
   */
  async findManyPaginated(
    filters: TagFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<Tag>> {
    // Build WHERE conditions
    const conditions = [];
    if (filters.search) {
      conditions.push(ilike(tagsTable.name, `%${filters.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build queries
    let countQuery = db.select({ count: count() }).from(tagsTable);
    let dataQuery = db.select().from(tagsTable).orderBy(tagsTable.name);

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    return paginate<Tag>({
      dataQuery,
      countQuery,
      options,
      defaultLimit: 50,
    });
  }

  /**
   * Create a new tag
   */
  async create(data: TagNew): Promise<Tag> {
    const [tag] = await db.insert(tagsTable).values(data).returning();

    return tag;
  }

  /**
   * Create a tag if it doesn't exist, otherwise return existing
   */
  async findOrCreate(name: string): Promise<Tag> {
    // Try to find existing tag first
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }

    // Create new tag
    return this.create({ name });
  }

  /**
   * Update tag by ID
   */
  async update(id: string, data: Partial<TagNew>): Promise<Tag> {
    const [updated] = await db
      .update(tagsTable)
      .set({ ...data, id: undefined })
      .where(eq(tagsTable.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Tag with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Delete tag by ID
   * Note: CASCADE will automatically delete all note_tags associations
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(tagsTable).where(eq(tagsTable.id, id)).returning();

    return result.length > 0;
  }

  /**
   * Get tags for a specific note
   */
  async getTagsForNote(noteId: string): Promise<Tag[]> {
    const result = await db
      .select({
        tag: tagsTable,
      })
      .from(noteTagsTable)
      .innerJoin(tagsTable, eq(noteTagsTable.tagId, tagsTable.id))
      .where(eq(noteTagsTable.noteId, noteId))
      .orderBy(tagsTable.name);

    return result.map((r) => r.tag);
  }

  /**
   * Add tag to note
   */
  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    await db.insert(noteTagsTable).values({ noteId, tagId }).onConflictDoNothing();
  }

  /**
   * Remove tag from note
   */
  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    await db
      .delete(noteTagsTable)
      .where(and(eq(noteTagsTable.noteId, noteId), eq(noteTagsTable.tagId, tagId)));
  }

  /**
   * Remove all tags from a note
   */
  async removeAllTagsFromNote(noteId: string): Promise<void> {
    await db.delete(noteTagsTable).where(eq(noteTagsTable.noteId, noteId));
  }

  /**
   * Set tags for a note (replaces existing tags)
   */
  async setTagsForNote(noteId: string, tagIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      // Remove existing tags
      await tx.delete(noteTagsTable).where(eq(noteTagsTable.noteId, noteId));

      // Add new tags
      if (tagIds.length > 0) {
        await tx.insert(noteTagsTable).values(tagIds.map((tagId) => ({ noteId, tagId })));
      }
    });
  }

  /**
   * Get orphaned tags (tags not associated with any notes)
   */
  async getOrphanedTags(): Promise<Tag[]> {
    const result = await db
      .select({ tag: tagsTable })
      .from(tagsTable)
      .leftJoin(noteTagsTable, eq(tagsTable.id, noteTagsTable.tagId))
      .where(sql`${noteTagsTable.noteId} IS NULL`)
      .orderBy(tagsTable.name);

    return result.map((r) => r.tag);
  }

  /**
   * Delete orphaned tags (tags not associated with any notes)
   */
  async deleteOrphanedTags(): Promise<number> {
    const orphanedTags = await this.getOrphanedTags();

    if (orphanedTags.length === 0) {
      return 0;
    }

    const result = await db
      .delete(tagsTable)
      .where(
        sql`${tagsTable.id} IN (
        SELECT ${tagsTable.id} 
        FROM ${tagsTable} 
        LEFT JOIN ${noteTagsTable} ON ${tagsTable.id} = ${noteTagsTable.tagId}
        WHERE ${noteTagsTable.noteId} IS NULL
      )`,
      )
      .returning();

    return result.length;
  }

  /**
   * Get tag usage statistics
   */
  async getTagStats(): Promise<{ tag: Tag; usageCount: number }[]> {
    const result = await db
      .select({
        tag: tagsTable,
        usageCount: count(noteTagsTable.noteId),
      })
      .from(tagsTable)
      .leftJoin(noteTagsTable, eq(tagsTable.id, noteTagsTable.tagId))
      .groupBy(tagsTable.id)
      .orderBy(desc(count(noteTagsTable.noteId)));

    return result.map((r) => ({ tag: r.tag, usageCount: r.usageCount }));
  }
}
