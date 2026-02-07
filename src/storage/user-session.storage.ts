import {
  userSessionsTable,
  type UserSession,
  type UserSessionNew,
} from "@/schema/user-session.schema";
import { usersTable } from "@/schema/users.schema";
import { and, asc, count, desc, eq, gt, ilike, isNull, lt, ne, or } from "drizzle-orm";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import { paginate } from "@/storage/helpers/pagination";
import type { BaseStorage, PaginatedResult, PaginationOptions } from "@/storage/types";

export type UserSessionWithUser = UserSession & { userName: string | null; userEmail: string };

export interface UserSessionFilterOptions {
  userId?: string;
  isRevoked?: boolean;
  isActive?: boolean; // not expired and not revoked
}

export interface AdminSessionFilterOptions {
  search?: string;
  deviceType?: string;
  userId?: string;
}

export interface ProfileSessionFilterOptions {
  search?: string;
  deviceType?: string;
}

export class UserSessionStorage implements BaseStorage<
  UserSession,
  UserSessionNew,
  Partial<UserSessionNew>
> {
  /**
   * Find session by ID
   */
  async findById(id: string): Promise<UserSession | undefined> {
    const result = await db
      .select()
      .from(userSessionsTable)
      .where(eq(userSessionsTable.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Find session by token
   */
  async findByToken(sessionToken: string): Promise<UserSession | undefined> {
    const result = await db
      .select()
      .from(userSessionsTable)
      .where(eq(userSessionsTable.sessionToken, sessionToken))
      .limit(1);

    return result[0];
  }

  /**
   * Find all sessions with optional filtering
   */
  async findMany(filters: UserSessionFilterOptions = {}): Promise<UserSession[]> {
    const conditions = this.buildWhereConditions(filters);

    let query = db.select().from(userSessionsTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return query.orderBy(desc(userSessionsTable.lastActivityAt));
  }

  /**
   * Find sessions with pagination
   */
  async findManyPaginated(
    filters: UserSessionFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<UserSession>> {
    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build queries
    let countQuery = db.select({ count: count() }).from(userSessionsTable);
    let dataQuery = db.select().from(userSessionsTable);

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    // Apply sorting
    const sortOrder = options.sortOrder || "desc";
    const sortColumn = userSessionsTable.lastActivityAt;

    if (sortOrder === "asc") {
      dataQuery = dataQuery.orderBy(asc(sortColumn)) as typeof dataQuery;
    } else {
      dataQuery = dataQuery.orderBy(desc(sortColumn)) as typeof dataQuery;
    }

    return paginate<UserSession>({
      dataQuery,
      countQuery,
      options,
    });
  }

  /**
   * Find all active sessions for a user (not expired and not revoked)
   */
  async findActiveByUserId(userId: string): Promise<UserSession[]> {
    return db
      .select()
      .from(userSessionsTable)
      .where(
        and(
          eq(userSessionsTable.userId, userId),
          eq(userSessionsTable.isRevoked, false),
          gt(userSessionsTable.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(userSessionsTable.lastActivityAt));
  }

  /**
   * Find all active sessions for a user with filtering and sorting
   */
  async findActiveByUserIdFiltered(
    userId: string,
    filters: ProfileSessionFilterOptions = {},
    options: { sortBy?: "lastActivityAt" | "createdAt"; sortOrder?: "asc" | "desc" } = {},
  ): Promise<UserSession[]> {
    const { search, deviceType } = filters;
    const sortBy = options.sortBy || "lastActivityAt";
    const sortOrder = options.sortOrder || "desc";

    const conditions = [
      eq(userSessionsTable.userId, userId),
      eq(userSessionsTable.isRevoked, false),
      gt(userSessionsTable.expiresAt, new Date()),
    ];

    // Add device type filter
    if (deviceType) {
      conditions.push(eq(userSessionsTable.deviceType, deviceType));
    }

    // Add search filter (browser, OS, location)
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(userSessionsTable.browser, searchTerm),
          ilike(userSessionsTable.os, searchTerm),
          ilike(userSessionsTable.city, searchTerm),
          ilike(userSessionsTable.country, searchTerm),
        )!,
      );
    }

    const sortColumn =
      sortBy === "createdAt" ? userSessionsTable.createdAt : userSessionsTable.lastActivityAt;

    let query = db
      .select()
      .from(userSessionsTable)
      .where(and(...conditions));

    if (sortOrder === "asc") {
      query = query.orderBy(asc(sortColumn)) as typeof query;
    } else {
      query = query.orderBy(desc(sortColumn)) as typeof query;
    }

    return query;
  }

  /**
   * Find all active sessions with user info (for admin view)
   */
  async findAllActiveWithUser(
    filters: AdminSessionFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<UserSession & { userName: string | null; userEmail: string }>> {
    // Build conditions: always filter active sessions
    const conditions = [
      eq(userSessionsTable.isRevoked, false),
      gt(userSessionsTable.expiresAt, new Date()),
    ];

    // Add search filter (user name or email)
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(or(ilike(usersTable.name, searchTerm), ilike(usersTable.email, searchTerm))!);
    }

    // Add device type filter
    if (filters.deviceType) {
      conditions.push(eq(userSessionsTable.deviceType, filters.deviceType));
    }

    // Add user filter
    if (filters.userId) {
      conditions.push(eq(userSessionsTable.userId, filters.userId));
    }

    const whereClause = and(...conditions);

    // Build queries with joins (count needs join for search filter)
    const countQuery = db
      .select({ count: count() })
      .from(userSessionsTable)
      .innerJoin(usersTable, eq(userSessionsTable.userId, usersTable.id))
      .where(whereClause);

    const dataQuery = db
      .select({
        id: userSessionsTable.id,
        userId: userSessionsTable.userId,
        sessionToken: userSessionsTable.sessionToken,
        userAgent: userSessionsTable.userAgent,
        ipAddress: userSessionsTable.ipAddress,
        deviceType: userSessionsTable.deviceType,
        browser: userSessionsTable.browser,
        os: userSessionsTable.os,
        city: userSessionsTable.city,
        country: userSessionsTable.country,
        countryCode: userSessionsTable.countryCode,
        region: userSessionsTable.region,
        isRevoked: userSessionsTable.isRevoked,
        revokedAt: userSessionsTable.revokedAt,
        revokedReason: userSessionsTable.revokedReason,
        createdAt: userSessionsTable.createdAt,
        expiresAt: userSessionsTable.expiresAt,
        lastActivityAt: userSessionsTable.lastActivityAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(userSessionsTable)
      .innerJoin(usersTable, eq(userSessionsTable.userId, usersTable.id))
      .where(whereClause)
      .orderBy(desc(userSessionsTable.lastActivityAt));

    return paginate({
      dataQuery,
      countQuery,
      options,
    });
  }

  /**
   * Create a new session
   */
  async create(sessionData: Omit<UserSessionNew, "id" | "createdAt">): Promise<UserSession> {
    const newSession: UserSessionNew = {
      ...sessionData,
      id: generateUUID(),
      createdAt: new Date(),
    };

    const [createdSession] = await db.insert(userSessionsTable).values(newSession).returning();

    return createdSession;
  }

  /**
   * Update session by ID
   */
  async update(id: string, data: Partial<UserSessionNew>): Promise<UserSession> {
    const [updatedSession] = await db
      .update(userSessionsTable)
      .set(data)
      .where(eq(userSessionsTable.id, id))
      .returning();

    if (!updatedSession) {
      throw new Error(`Session with ID ${id} not found`);
    }

    return updatedSession;
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(sessionToken: string): Promise<boolean> {
    const result = await db
      .update(userSessionsTable)
      .set({ lastActivityAt: new Date() })
      .where(
        and(
          eq(userSessionsTable.sessionToken, sessionToken),
          eq(userSessionsTable.isRevoked, false),
        ),
      )
      .returning({ id: userSessionsTable.id });

    return result.length > 0;
  }

  /**
   * Touch a session (update last activity and/or extend expiry) by session ID.
   * Intended for use with JWT sessions where we track sessionId, not sessionToken.
   */
  async touchById(
    sessionId: string,
    updates: { lastActivityAt?: Date; expiresAt?: Date },
  ): Promise<boolean> {
    const setData: Partial<Pick<UserSessionNew, "lastActivityAt" | "expiresAt">> = {};

    if (updates.lastActivityAt) {
      setData.lastActivityAt = updates.lastActivityAt;
    }

    if (updates.expiresAt) {
      setData.expiresAt = updates.expiresAt;
    }

    if (Object.keys(setData).length === 0) {
      return false;
    }

    const now = new Date();
    const result = await db
      .update(userSessionsTable)
      .set(setData)
      .where(
        and(
          eq(userSessionsTable.id, sessionId),
          eq(userSessionsTable.isRevoked, false),
          gt(userSessionsTable.expiresAt, now),
          // Also check absolute expiry if exists
          or(
            isNull(userSessionsTable.absoluteExpiresAt),
            gt(userSessionsTable.absoluteExpiresAt, now),
          ),
        ),
      )
      .returning({ id: userSessionsTable.id });

    return result.length > 0;
  }

  /**
   * Revoke a session
   */
  async revoke(id: string, reason?: string): Promise<UserSession> {
    const [revokedSession] = await db
      .update(userSessionsTable)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      })
      .where(eq(userSessionsTable.id, id))
      .returning();

    if (!revokedSession) {
      throw new Error(`Session with ID ${id} not found`);
    }

    return revokedSession;
  }

  /**
   * Revoke all sessions for a user (except optionally one)
   */
  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<number> {
    const conditions = [
      eq(userSessionsTable.userId, userId),
      eq(userSessionsTable.isRevoked, false),
    ];

    // Add exclusion condition if exceptSessionId is provided
    if (exceptSessionId) {
      conditions.push(ne(userSessionsTable.id, exceptSessionId));
    }

    const result = await db
      .update(userSessionsTable)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "Revoked all sessions",
      })
      .where(and(...conditions))
      .returning({ id: userSessionsTable.id });

    return result.length;
  }

  /**
   * Delete session by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(userSessionsTable)
      .where(eq(userSessionsTable.id, id))
      .returning({ id: userSessionsTable.id });

    return result.length > 0;
  }

  /**
   * Delete expired sessions (cleanup)
   */
  async deleteExpired(): Promise<number> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await db
      .delete(userSessionsTable)
      .where(
        or(
          // Expired sessions
          lt(userSessionsTable.expiresAt, now),
          // Revoked sessions older than 30 days
          and(
            eq(userSessionsTable.isRevoked, true),
            lt(userSessionsTable.revokedAt, thirtyDaysAgo),
          ),
        ),
      )
      .returning({ id: userSessionsTable.id });

    return result.length;
  }

  /**
   * Check if a session token is valid (not revoked and not expired)
   */
  async isTokenValid(sessionToken: string): Promise<boolean> {
    const session = await this.findByToken(sessionToken);

    if (!session) return false;
    if (session.isRevoked) return false;
    if (new Date() > session.expiresAt) return false;

    return true;
  }

  /**
   * Get session count for a user
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(userSessionsTable)
      .where(
        and(
          eq(userSessionsTable.userId, userId),
          eq(userSessionsTable.isRevoked, false),
          gt(userSessionsTable.expiresAt, new Date()),
        ),
      );

    return total;
  }

  /**
   * Build WHERE conditions based on filters
   */
  private buildWhereConditions(filters: UserSessionFilterOptions) {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(userSessionsTable.userId, filters.userId));
    }

    if (filters.isRevoked !== undefined) {
      conditions.push(eq(userSessionsTable.isRevoked, filters.isRevoked));
    }

    if (filters.isActive) {
      conditions.push(eq(userSessionsTable.isRevoked, false));
      conditions.push(gt(userSessionsTable.expiresAt, new Date()));
    }

    return conditions;
  }
}
