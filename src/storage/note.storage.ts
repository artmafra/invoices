import { notesTable, type Note, type NoteNew } from "@/schema/notes.schema";
import { noteTagsTable, tagsTable, type Tag } from "@/schema/tags.schema";
import { usersTable } from "@/schema/users.schema";
import { and, asc, count, desc, eq, ilike, max, or } from "drizzle-orm";
import { versionCache } from "@/lib/cache/version-cache.service";
import { db } from "@/db/postgres";
import { paginate } from "@/storage/helpers/pagination";
import type { BaseStorage, PaginatedResult, PaginationOptions } from "@/storage/types";

/**
 * Filter options for notes queries
 */
export interface NoteFilterOptions {
  search?: string;
  isPinned?: boolean;
  color?: string;
  createdById?: string;
  isArchived?: boolean;
  tagIds?: string[];
}

/**
 * Note with creator information and tags
 */
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

export class NoteStorage implements BaseStorage<Note, NoteNew, Partial<NoteNew>> {
  /**
   * Build WHERE conditions based on filters
   */
  private buildWhereConditions(filters: NoteFilterOptions) {
    const conditions = [];

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(ilike(notesTable.title, searchTerm), ilike(notesTable.content, searchTerm)),
      );
    }

    if (filters.isPinned !== undefined) {
      conditions.push(eq(notesTable.isPinned, filters.isPinned));
    }

    if (filters.color) {
      conditions.push(eq(notesTable.color, filters.color));
    }

    if (filters.createdById) {
      conditions.push(eq(notesTable.createdById, filters.createdById));
    }

    if (filters.isArchived !== undefined) {
      conditions.push(eq(notesTable.isArchived, filters.isArchived));
    }

    return conditions;
  }

  /**
   * Get column for sorting
   */
  private getSortColumn(sortBy: string) {
    switch (sortBy) {
      case "title":
        return notesTable.title;
      case "createdAt":
        return notesTable.createdAt;
      case "updatedAt":
        return notesTable.updatedAt;
      default:
        return notesTable.createdAt;
    }
  }

  /**
   * Get collection version for ETag generation.
   * Returns max(updated_at) and count for the filtered set.
   *
   * Uses Redis caching with 10-second TTL to reduce database load.
   */
  async getCollectionVersion(
    filters: NoteFilterOptions = {},
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    const cacheKey = versionCache.buildCacheKey("notes", filters);

    return versionCache.getOrFetch(cacheKey, async () => {
      const conditions = this.buildWhereConditions(filters);
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db
        .select({
          maxUpdatedAt: max(notesTable.updatedAt),
          count: count(notesTable.id),
        })
        .from(notesTable);

      const [result] = whereClause ? await query.where(whereClause) : await query;

      return {
        maxUpdatedAt: result?.maxUpdatedAt ? new Date(result.maxUpdatedAt) : null,
        count: result?.count ?? 0,
      };
    });
  }

  /**
   * Find note by ID
   */
  async findById(id: string): Promise<Note | undefined> {
    const result = await db.select().from(notesTable).where(eq(notesTable.id, id)).limit(1);

    return result[0];
  }

  /**
   * Find note by ID with creator info
   */
  async findByIdWithCreator(id: string): Promise<NoteWithCreator | undefined> {
    const createdByUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("createdByUser");

    const updatedByUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("updatedByUser");

    const result = await db
      .select({
        note: notesTable,
        createdBy: {
          id: createdByUser.id,
          name: createdByUser.name,
          email: createdByUser.email,
        },
        updatedBy: {
          id: updatedByUser.id,
          name: updatedByUser.name,
          email: updatedByUser.email,
        },
      })
      .from(notesTable)
      .leftJoin(createdByUser, eq(notesTable.createdById, createdByUser.id))
      .leftJoin(updatedByUser, eq(notesTable.updatedById, updatedByUser.id))
      .where(eq(notesTable.id, id))
      .limit(1);

    if (!result[0]) return undefined;

    // Fetch tags for this note
    const tags = await this.getTagsForNote(id);

    return {
      ...result[0].note,
      createdBy: result[0].createdBy?.id ? result[0].createdBy : null,
      updatedBy: result[0].updatedBy?.id ? result[0].updatedBy : null,
      tags,
    };
  }

  /**
   * Get tags for a specific note
   */
  private async getTagsForNote(noteId: string): Promise<Tag[]> {
    const result = await db
      .select({ tag: tagsTable })
      .from(noteTagsTable)
      .innerJoin(tagsTable, eq(noteTagsTable.tagId, tagsTable.id))
      .where(eq(noteTagsTable.noteId, noteId))
      .orderBy(tagsTable.name);

    return result.map((r) => r.tag);
  }

  /**
   * Get tags for multiple notes (batch fetch for efficiency)
   */
  private async getTagsForNotes(noteIds: string[]): Promise<Map<string, Tag[]>> {
    if (noteIds.length === 0) {
      return new Map();
    }

    const result = await db
      .select({
        noteId: noteTagsTable.noteId,
        tag: tagsTable,
      })
      .from(noteTagsTable)
      .innerJoin(tagsTable, eq(noteTagsTable.tagId, tagsTable.id))
      .where(
        noteIds.length === 1
          ? eq(noteTagsTable.noteId, noteIds[0])
          : or(...noteIds.map((id) => eq(noteTagsTable.noteId, id)))!,
      )
      .orderBy(tagsTable.name);

    // Group tags by note ID
    const tagsMap = new Map<string, Tag[]>();
    for (const row of result) {
      if (!tagsMap.has(row.noteId)) {
        tagsMap.set(row.noteId, []);
      }
      tagsMap.get(row.noteId)!.push(row.tag);
    }

    return tagsMap;
  }

  /**
   * Find multiple notes with optional filtering
   */
  async findMany(filters: NoteFilterOptions = {}): Promise<Note[]> {
    const conditions = this.buildWhereConditions(filters);

    let query = db.select().from(notesTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Pinned notes first, then by creation date
    return query.orderBy(desc(notesTable.isPinned), desc(notesTable.createdAt));
  }

  /**
   * Find notes with pagination and creator info
   */
  async findManyPaginated(
    filters: NoteFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<NoteWithCreator>> {
    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Subqueries for user info
    const createdByUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("createdByUser");

    const updatedByUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("updatedByUser");

    // Build queries
    let countQuery = db.select({ count: count() }).from(notesTable);
    let dataQuery = db
      .select({
        note: notesTable,
        createdBy: {
          id: createdByUser.id,
          name: createdByUser.name,
          email: createdByUser.email,
        },
        updatedBy: {
          id: updatedByUser.id,
          name: updatedByUser.name,
          email: updatedByUser.email,
        },
      })
      .from(notesTable)
      .leftJoin(createdByUser, eq(notesTable.createdById, createdByUser.id))
      .leftJoin(updatedByUser, eq(notesTable.updatedById, updatedByUser.id));

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    // Apply sorting - pinned first, then by specified column
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder || "desc";
    const sortColumn = this.getSortColumn(sortBy);

    if (sortOrder === "asc") {
      dataQuery = dataQuery.orderBy(desc(notesTable.isPinned), asc(sortColumn)) as typeof dataQuery;
    } else {
      dataQuery = dataQuery.orderBy(
        desc(notesTable.isPinned),
        desc(sortColumn),
      ) as typeof dataQuery;
    }

    // Use pagination helper
    const result = await paginate({
      dataQuery,
      countQuery,
      options,
    });

    // Fetch tags for all notes in batch (post-processing)
    const noteIds = result.data.map((r) => r.note.id);
    const tagsMap = await this.getTagsForNotes(noteIds);

    const data: NoteWithCreator[] = result.data.map((row) => ({
      ...row.note,
      createdBy: row.createdBy?.id ? row.createdBy : null,
      updatedBy: row.updatedBy?.id ? row.updatedBy : null,
      tags: tagsMap.get(row.note.id) || [],
    }));

    return {
      ...result,
      data,
    };
  }

  /**
   * Create a new note
   */
  async create(noteData: NoteNew): Promise<Note> {
    const [createdNote] = await db
      .insert(notesTable)
      .values({
        ...noteData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Invalidate version cache
    await versionCache.invalidate("notes");

    return createdNote;
  }

  /**
   * Update note by ID
   */
  async update(id: string, noteData: Partial<NoteNew>): Promise<Note> {
    const [updatedNote] = await db
      .update(notesTable)
      .set({
        ...noteData,
        updatedAt: new Date(),
      })
      .where(eq(notesTable.id, id))
      .returning();

    if (!updatedNote) {
      throw new Error(`Note with ID ${id} not found`);
    }

    // Invalidate version cache
    await versionCache.invalidate("notes");

    return updatedNote;
  }

  /**
   * Delete note by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(notesTable)
      .where(eq(notesTable.id, id))
      .returning({ id: notesTable.id });

    const deleted = result.length > 0;

    if (deleted) {
      // Invalidate version cache
      await versionCache.invalidate("notes");
    }

    return deleted;
  }

  /**
   * Toggle pin status
   */
  async togglePin(id: string): Promise<Note> {
    const note = await this.findById(id);
    if (!note) {
      throw new Error(`Note with ID ${id} not found`);
    }

    return this.update(id, { isPinned: !note.isPinned });
  }

  /**
   * Get pinned notes
   */
  async findPinned(): Promise<Note[]> {
    return db
      .select()
      .from(notesTable)
      .where(eq(notesTable.isPinned, true))
      .orderBy(desc(notesTable.updatedAt));
  }

  /**
   * Get notes by creator
   */
  async findByCreator(userId: string): Promise<Note[]> {
    return db
      .select()
      .from(notesTable)
      .where(eq(notesTable.createdById, userId))
      .orderBy(desc(notesTable.isPinned), desc(notesTable.createdAt));
  }
}
