import { activitiesTable, type Activity, type ActivityNew } from "@/schema/activities.schema";
import { usersTable } from "@/schema/users.schema";
import { and, asc, count, desc, eq, gte, ilike, lte, max, or, sql } from "drizzle-orm";
import { db } from "@/db/postgres";
import { paginate } from "@/storage/helpers/pagination";
import type { PaginatedResult, PaginationOptions } from "./types";

/**
 * Filter options for activity queries
 */
export interface ActivityFilterOptions {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

/**
 * Activity with user details
 */
export interface ActivityWithUser extends Activity {
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
}

export class ActivityStorage {
  /**
   * Build WHERE conditions based on filters
   */
  private buildWhereConditions(filters: ActivityFilterOptions) {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(activitiesTable.userId, filters.userId));
    }

    if (filters.action) {
      conditions.push(eq(activitiesTable.action, filters.action));
    }

    if (filters.resource) {
      conditions.push(eq(activitiesTable.resource, filters.resource));
    }

    if (filters.startDate) {
      conditions.push(gte(activitiesTable.createdAt, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(activitiesTable.createdAt, filters.endDate));
    }

    if (filters.search) {
      // Use PostgreSQL full-text search with GIN index (100x faster than ILIKE)
      // The search_vector column is a generated tsvector that includes:
      // action, resource, details, and sessionInfo fields
      // plainto_tsquery converts the search term to a tsquery (handles stemming, stopwords)
      conditions.push(
        or(
          // Full-text search on indexed search_vector (action, resource, details, sessionInfo)
          sql`${activitiesTable}.search_vector @@ plainto_tsquery('english', ${filters.search})`,
          // Also search in resourceId (not in search_vector)
          ilike(activitiesTable.resourceId, `%${filters.search}%`),
          // Search in joined user name
          ilike(usersTable.name, `%${filters.search}%`),
          // Search in joined user email
          ilike(usersTable.email, `%${filters.search}%`),
        ),
      );
    }

    return conditions;
  }

  /**
   * Create a new activity entry with integrity fields
   */
  async create(data: ActivityNew): Promise<Activity> {
    const [createdActivity] = await db.insert(activitiesTable).values(data).returning();

    return createdActivity;
  }

  /**
   * Create a new activity entry with chain integrity protection.
   * Uses a database transaction with row locking to ensure sequential chain integrity.
   *
   * This method handles:
   * 1. Locking the last entry to prevent race conditions (via FOR UPDATE in getLastContentHash)
   * 2. Creating the new entry with proper chain linking
   *
   * @param data The activity data to insert (must include contentHash, previousHash, signature)
   * @returns The created activity
   */
  async createWithIntegrityChain(data: ActivityNew): Promise<Activity> {
    return db.transaction(async (tx) => {
      // Lock the last entry to prevent race conditions
      // This ensures no other transaction can insert between reading and writing
      await tx.execute(sql`
        SELECT content_hash 
        FROM activities 
        ORDER BY sequence_number DESC 
        LIMIT 1 
        FOR UPDATE
      `);

      // Insert the new entry
      const [createdActivity] = await tx.insert(activitiesTable).values(data).returning();

      return createdActivity;
    });
  }

  /**
   * Get the last activity entry's content hash for chain linking.
   * Called within a transaction with FOR UPDATE to prevent race conditions.
   *
   * @returns The contentHash of the last entry, or null if no entries exist
   */
  async getLastContentHash(): Promise<string | null> {
    // Use raw SQL for FOR UPDATE since Drizzle doesn't support it directly
    const result = await db.execute<{ content_hash: string }>(sql`
      SELECT content_hash 
      FROM activities 
      ORDER BY sequence_number DESC 
      LIMIT 1 
      FOR UPDATE
    `);

    // db.execute returns array directly in Drizzle
    const rows = result as unknown as { content_hash: string }[];
    if (rows.length === 0) {
      return null;
    }

    return rows[0].content_hash;
  }

  /**
   * Get total count of activities (for verification progress)
   */
  async getTotalCount(): Promise<number> {
    const [{ count: total }] = await db.select({ count: count() }).from(activitiesTable);
    return total;
  }

  /**
   * Get activities ordered by sequence number for chain verification.
   * Fetches in batches for memory efficiency.
   *
   * @param options.startSequence Start from this sequence number (inclusive)
   * @param options.limit Number of entries to fetch
   * @returns Activities ordered by sequence number ascending
   */
  async findForVerification(options: {
    startSequence?: number;
    limit: number;
  }): Promise<
    Pick<
      Activity,
      | "id"
      | "sequenceNumber"
      | "userId"
      | "action"
      | "resource"
      | "resourceId"
      | "details"
      | "sessionInfo"
      | "createdAt"
      | "contentHash"
      | "previousHash"
      | "signature"
    >[]
  > {
    const conditions = [];

    if (options.startSequence !== undefined) {
      conditions.push(gte(activitiesTable.sequenceNumber, options.startSequence));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = db
      .select({
        id: activitiesTable.id,
        sequenceNumber: activitiesTable.sequenceNumber,
        userId: activitiesTable.userId,
        action: activitiesTable.action,
        resource: activitiesTable.resource,
        resourceId: activitiesTable.resourceId,
        details: activitiesTable.details,
        sessionInfo: activitiesTable.sessionInfo,
        createdAt: activitiesTable.createdAt,
        contentHash: activitiesTable.contentHash,
        previousHash: activitiesTable.previousHash,
        signature: activitiesTable.signature,
      })
      .from(activitiesTable)
      .orderBy(asc(activitiesTable.sequenceNumber))
      .limit(options.limit);

    const results = whereClause ? await baseQuery.where(whereClause) : await baseQuery;

    // Truncate timestamps to seconds for consistent hash verification
    return results.map((row) => ({
      ...row,
      createdAt: new Date(Math.floor(row.createdAt.getTime() / 1000) * 1000),
    }));
  }

  /**
   * Get the N most recent activities for quick verification.
   *
   * @param limit Number of entries to fetch (from most recent)
   * @returns Activities ordered by sequence number ascending (oldest first in batch)
   */
  async findRecentForVerification(
    limit: number,
  ): Promise<
    Pick<
      Activity,
      | "id"
      | "sequenceNumber"
      | "userId"
      | "action"
      | "resource"
      | "resourceId"
      | "details"
      | "sessionInfo"
      | "createdAt"
      | "contentHash"
      | "previousHash"
      | "signature"
    >[]
  > {
    // Subquery to get the last N entries, then order ascending
    const result = await db.execute<{
      id: string;
      sequence_number: number;
      user_id: string | null;
      action: string;
      resource: string;
      resource_id: string | null;
      details: unknown;
      session_info: unknown;
      created_at: Date;
      content_hash: string;
      previous_hash: string;
      signature: string;
    }>(sql`
      SELECT id, sequence_number, user_id, action, resource, resource_id, details, session_info, created_at, content_hash, previous_hash, signature
      FROM (
        SELECT id, sequence_number, user_id, action, resource, resource_id, details, session_info, created_at, content_hash, previous_hash, signature
        FROM activities
        ORDER BY sequence_number DESC
        LIMIT ${limit}
      ) sub
      ORDER BY sequence_number ASC
    `);

    // db.execute returns array directly in Drizzle
    const rows = result as unknown as {
      id: string;
      sequence_number: number;
      user_id: string | null;
      action: string;
      resource: string;
      resource_id: string | null;
      details: unknown;
      session_info: unknown;
      created_at: Date;
      content_hash: string;
      previous_hash: string;
      signature: string;
    }[];

    return rows.map((row) => ({
      id: row.id,
      sequenceNumber: row.sequence_number,
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      details: row.details as Activity["details"],
      sessionInfo: row.session_info as Activity["sessionInfo"],
      // Truncate to seconds for consistent hash verification (matches write behavior)
      createdAt: new Date(Math.floor(new Date(row.created_at).getTime() / 1000) * 1000),
      contentHash: row.content_hash,
      previousHash: row.previous_hash,
      signature: row.signature,
    }));
  }

  /**
   * Get the entry just before a given sequence number (for chain verification starting point)
   */
  async findPreviousEntry(
    sequenceNumber: number,
  ): Promise<Pick<Activity, "id" | "sequenceNumber" | "contentHash"> | null> {
    const result = await db
      .select({
        id: activitiesTable.id,
        sequenceNumber: activitiesTable.sequenceNumber,
        contentHash: activitiesTable.contentHash,
      })
      .from(activitiesTable)
      .where(sql`${activitiesTable.sequenceNumber} < ${sequenceNumber}`)
      .orderBy(desc(activitiesTable.sequenceNumber))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find activity by ID
   */
  async findById(id: string): Promise<Activity | undefined> {
    const result = await db
      .select()
      .from(activitiesTable)
      .where(eq(activitiesTable.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Find activities with pagination and user details
   */
  async findManyPaginated(
    filters: ActivityFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build count query with join (needed for user search)
    let countQuery = db
      .select({ count: count() })
      .from(activitiesTable)
      .leftJoin(usersTable, eq(activitiesTable.userId, usersTable.id));

    // Build data query with user details
    let dataQuery = db
      .select({
        id: activitiesTable.id,
        userId: activitiesTable.userId,
        action: activitiesTable.action,
        resource: activitiesTable.resource,
        resourceId: activitiesTable.resourceId,
        details: activitiesTable.details,
        sessionInfo: activitiesTable.sessionInfo,
        searchVector: activitiesTable.searchVector,
        createdAt: activitiesTable.createdAt,
        sequenceNumber: activitiesTable.sequenceNumber,
        contentHash: activitiesTable.contentHash,
        previousHash: activitiesTable.previousHash,
        signature: activitiesTable.signature,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userImage: usersTable.image,
      })
      .from(activitiesTable)
      .leftJoin(usersTable, eq(activitiesTable.userId, usersTable.id))
      .orderBy(desc(activitiesTable.createdAt));

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    return paginate<ActivityWithUser>({
      dataQuery,
      countQuery,
      options,
    });
  }

  /**
   * Count recent login failure activities by IP address (for rate limiting)
   * Searches in sessionInfo.ipAddress or details.metadata.ipAddress
   */
  async countRecentLoginFailuresByIp(
    ipAddress: string,
    windowMinutes: number = 15,
  ): Promise<number> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const [{ count: total }] = await db
      .select({ count: count() })
      .from(activitiesTable)
      .where(
        and(
          eq(activitiesTable.action, "auth.login_failed"),
          gte(activitiesTable.createdAt, windowStart),
          or(
            // Check sessionInfo.ipAddress (for logged-in users with session)
            sql`${activitiesTable.sessionInfo}->>'ipAddress' = ${ipAddress}`,
            // Check details.metadata.ipAddress (for login failures without session)
            sql`${activitiesTable.details}->'metadata'->>'ipAddress' = ${ipAddress}`,
          ),
        ),
      );

    return total;
  }

  /**
   * Get distinct actions for filtering
   */
  async getDistinctActions(): Promise<string[]> {
    const results = await db
      .selectDistinct({ action: activitiesTable.action })
      .from(activitiesTable)
      .orderBy(activitiesTable.action);

    return results.map((r) => r.action);
  }

  /**
   * Get distinct resources for filtering
   */
  async getDistinctResources(): Promise<string[]> {
    const results = await db
      .selectDistinct({ resource: activitiesTable.resource })
      .from(activitiesTable)
      .orderBy(activitiesTable.resource);

    return results.map((r) => r.resource);
  }

  /**
   * Get version info for activity filters ETag.
   * Returns max(created_at) and total count - when new activities are added,
   * the distinct actions/resources might change.
   */
  async getFiltersVersion(): Promise<{ maxCreatedAt: Date | null; count: number }> {
    const [result] = await db
      .select({
        maxCreatedAt: max(activitiesTable.createdAt),
        count: count(activitiesTable.id),
      })
      .from(activitiesTable);

    return {
      maxCreatedAt: result?.maxCreatedAt ? new Date(result.maxCreatedAt) : null,
      count: result?.count ?? 0,
    };
  }

  /**
   * Get activity summary by action type (for dashboard charts)
   */
  async getActivitySummary(days: number = 7): Promise<{ action: string; count: number }[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const results = await db
      .select({
        action: activitiesTable.action,
        count: count(),
      })
      .from(activitiesTable)
      .where(gte(activitiesTable.createdAt, startDate))
      .groupBy(activitiesTable.action)
      .orderBy(desc(count()));

    return results;
  }

  /**
   * Get recent activity for a specific user
   */
  async getRecentByUser(userId: string, limit: number = 10): Promise<Activity[]> {
    return db
      .select()
      .from(activitiesTable)
      .where(eq(activitiesTable.userId, userId))
      .orderBy(desc(activitiesTable.createdAt))
      .limit(limit);
  }

  /**
   * Delete old activities (for cleanup/retention)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await db
      .delete(activitiesTable)
      .where(lte(activitiesTable.createdAt, cutoffDate))
      .returning({ id: activitiesTable.id });

    return result.length;
  }
}
