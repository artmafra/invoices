import { taskListsTable, type TaskList, type TaskListNew } from "@/schema/task-lists.schema";
import {
  tasksTable,
  type Task,
  type TaskNew,
  type TaskPriority,
  type TaskStatus,
} from "@/schema/tasks.schema";
import { usersTable } from "@/schema/users.schema";
import { and, asc, count, desc, eq, gte, ilike, isNull, lte, max, or } from "drizzle-orm";
import { versionCache } from "@/lib/cache/version-cache.service";
import { db } from "@/db/postgres";
import { paginate } from "@/storage/helpers/pagination";
import type { BaseStorage, PaginatedResult, PaginationOptions } from "@/storage/types";

/**
 * Filter options for task queries
 */
export interface TaskFilterOptions {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  listId?: string | null;
  assigneeId?: string;
  createdById?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  includeCompleted?: boolean;
}

/**
 * Filter options for task list queries
 */
export interface TaskListFilterOptions {
  search?: string;
  createdById?: string;
}

/**
 * Task with related user information
 */
export interface TaskWithRelations extends Task {
  assignee: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  list: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

export class TaskStorage implements BaseStorage<Task, TaskNew, Partial<TaskNew>> {
  /**
   * Build WHERE conditions based on filters
   */
  private buildWhereConditions(filters: TaskFilterOptions) {
    const conditions = [];

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(ilike(tasksTable.title, searchTerm), ilike(tasksTable.description, searchTerm)),
      );
    }

    if (filters.status) {
      conditions.push(eq(tasksTable.status, filters.status));
    }

    if (filters.priority) {
      conditions.push(eq(tasksTable.priority, filters.priority));
    }

    if (filters.listId !== undefined) {
      if (filters.listId === null) {
        conditions.push(isNull(tasksTable.listId));
      } else {
        conditions.push(eq(tasksTable.listId, filters.listId));
      }
    }

    if (filters.assigneeId) {
      conditions.push(eq(tasksTable.assigneeId, filters.assigneeId));
    }

    if (filters.createdById) {
      conditions.push(eq(tasksTable.createdById, filters.createdById));
    }

    if (filters.dueBefore) {
      conditions.push(lte(tasksTable.dueDate, filters.dueBefore));
    }

    if (filters.dueAfter) {
      conditions.push(gte(tasksTable.dueDate, filters.dueAfter));
    }

    if (!filters.includeCompleted) {
      conditions.push(isNull(tasksTable.completedAt));
    }

    return conditions;
  }

  /**
   * Get collection version for ETag generation.
   * Returns max(updated_at) and count for the filtered set.
   *
   * Uses Redis caching with 10-second TTL to reduce database load.
   */
  async getCollectionVersion(
    filters: TaskFilterOptions = {},
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    const cacheKey = versionCache.buildCacheKey("tasks", filters);

    return versionCache.getOrFetch(cacheKey, async () => {
      const conditions = this.buildWhereConditions(filters);
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db
        .select({
          maxUpdatedAt: max(tasksTable.updatedAt),
          count: count(tasksTable.id),
        })
        .from(tasksTable);

      const [result] = whereClause ? await query.where(whereClause) : await query;

      return {
        maxUpdatedAt: result?.maxUpdatedAt ? new Date(result.maxUpdatedAt) : null,
        count: result?.count ?? 0,
      };
    });
  }

  /**
   * Get column for sorting
   */
  private getSortColumn(sortBy: string) {
    switch (sortBy) {
      case "title":
        return tasksTable.title;
      case "status":
        return tasksTable.status;
      case "priority":
        return tasksTable.priority;
      case "dueDate":
        return tasksTable.dueDate;
      case "createdAt":
        return tasksTable.createdAt;
      case "updatedAt":
        return tasksTable.updatedAt;
      case "sortOrder":
        return tasksTable.sortOrder;
      default:
        return tasksTable.createdAt;
    }
  }

  /**
   * Find task by ID
   */
  async findById(id: string): Promise<Task | undefined> {
    const result = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).limit(1);

    return result[0];
  }

  /**
   * Find task by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<TaskWithRelations | undefined> {
    const assigneeUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("assigneeUser");

    const createdByUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("createdByUser");

    const result = await db
      .select({
        task: tasksTable,
        assignee: {
          id: assigneeUser.id,
          name: assigneeUser.name,
          email: assigneeUser.email,
        },
        createdBy: {
          id: createdByUser.id,
          name: createdByUser.name,
          email: createdByUser.email,
        },
        list: {
          id: taskListsTable.id,
          name: taskListsTable.name,
          color: taskListsTable.color,
        },
      })
      .from(tasksTable)
      .leftJoin(assigneeUser, eq(tasksTable.assigneeId, assigneeUser.id))
      .leftJoin(createdByUser, eq(tasksTable.createdById, createdByUser.id))
      .leftJoin(taskListsTable, eq(tasksTable.listId, taskListsTable.id))
      .where(eq(tasksTable.id, id))
      .limit(1);

    if (!result[0]) return undefined;

    return {
      ...result[0].task,
      assignee: result[0].assignee?.id ? result[0].assignee : null,
      createdBy: result[0].createdBy?.id ? result[0].createdBy : null,
      list: result[0].list?.id ? result[0].list : null,
    };
  }

  /**
   * Find multiple tasks with optional filtering
   */
  async findMany(filters: TaskFilterOptions = {}): Promise<Task[]> {
    const conditions = this.buildWhereConditions(filters);

    let query = db.select().from(tasksTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return query.orderBy(asc(tasksTable.sortOrder), desc(tasksTable.createdAt));
  }

  /**
   * Find tasks with pagination and relations
   */
  async findManyPaginated(
    filters: TaskFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<TaskWithRelations>> {
    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Subqueries for user info
    const assigneeUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("assigneeUser");

    const createdByUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("createdByUser");

    // Build queries
    let countQuery = db.select({ count: count() }).from(tasksTable);
    let dataQuery = db
      .select({
        task: tasksTable,
        assignee: {
          id: assigneeUser.id,
          name: assigneeUser.name,
          email: assigneeUser.email,
        },
        createdBy: {
          id: createdByUser.id,
          name: createdByUser.name,
          email: createdByUser.email,
        },
        list: {
          id: taskListsTable.id,
          name: taskListsTable.name,
          color: taskListsTable.color,
        },
      })
      .from(tasksTable)
      .leftJoin(assigneeUser, eq(tasksTable.assigneeId, assigneeUser.id))
      .leftJoin(createdByUser, eq(tasksTable.createdById, createdByUser.id))
      .leftJoin(taskListsTable, eq(tasksTable.listId, taskListsTable.id));

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    // Apply sorting
    const sortBy = options.sortBy || "sortOrder";
    const sortOrder = options.sortOrder || "asc";
    const sortColumn = this.getSortColumn(sortBy);

    if (sortOrder === "asc") {
      dataQuery = dataQuery.orderBy(asc(sortColumn)) as typeof dataQuery;
    } else {
      dataQuery = dataQuery.orderBy(desc(sortColumn)) as typeof dataQuery;
    }

    // Use pagination helper
    const result = await paginate({
      dataQuery,
      countQuery,
      options,
    });

    // Map results to TaskWithRelations structure
    const data: TaskWithRelations[] = result.data.map((row) => ({
      ...row.task,
      assignee: row.assignee?.id ? row.assignee : null,
      createdBy: row.createdBy?.id ? row.createdBy : null,
      list: row.list?.id ? row.list : null,
    }));

    return {
      ...result,
      data,
    };
  }

  /**
   * Create a new task
   */
  async create(taskData: TaskNew): Promise<Task> {
    const [createdTask] = await db
      .insert(tasksTable)
      .values({
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Invalidate version cache
    await versionCache.invalidate("tasks");

    return createdTask;
  }

  /**
   * Update task by ID
   */
  async update(id: string, taskData: Partial<TaskNew>): Promise<Task> {
    const updateData: Partial<TaskNew> & { completedAt?: Date | null } = {
      ...taskData,
      updatedAt: new Date(),
    };

    // Handle completedAt based on status change
    if (taskData.status === "done") {
      updateData.completedAt = new Date();
    } else if (taskData.status) {
      // Status is changing to something other than done, clear completedAt
      updateData.completedAt = null;
    }

    const [updatedTask] = await db
      .update(tasksTable)
      .set(updateData)
      .where(eq(tasksTable.id, id))
      .returning();

    if (!updatedTask) {
      throw new Error(`Task with ID ${id} not found`);
    }

    // Invalidate version cache
    await versionCache.invalidate("tasks");

    return updatedTask;
  }

  /**
   * Delete task by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(tasksTable)
      .where(eq(tasksTable.id, id))
      .returning({ id: tasksTable.id });

    const deleted = result.length > 0;

    if (deleted) {
      // Invalidate version cache
      await versionCache.invalidate("tasks");
    }

    return deleted;
  }

  /**
   * Update task status
   */
  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.update(id, { status });
  }

  /**
   * Assign task to user
   */
  async assignTo(id: string, assigneeId: string | null): Promise<Task> {
    return this.update(id, { assigneeId });
  }

  /**
   * Move task to a list
   */
  async moveToList(id: string, listId: string | null): Promise<Task> {
    return this.update(id, { listId });
  }

  /**
   * Get tasks by list
   */
  async findByList(listId: string | null): Promise<Task[]> {
    if (listId === null) {
      return db
        .select()
        .from(tasksTable)
        .where(isNull(tasksTable.listId))
        .orderBy(asc(tasksTable.sortOrder), desc(tasksTable.createdAt));
    }

    return db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.listId, listId))
      .orderBy(asc(tasksTable.sortOrder), desc(tasksTable.createdAt));
  }

  /**
   * Get tasks assigned to a user
   */
  async findByAssignee(userId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.assigneeId, userId))
      .orderBy(asc(tasksTable.sortOrder), desc(tasksTable.createdAt));
  }

  /**
   * Get overdue tasks
   */
  async findOverdue(): Promise<Task[]> {
    return db
      .select()
      .from(tasksTable)
      .where(and(lte(tasksTable.dueDate, new Date()), isNull(tasksTable.completedAt)))
      .orderBy(asc(tasksTable.dueDate));
  }

  // =============================================================================
  // Task Lists Methods
  // =============================================================================

  /**
   * Get collection version for task lists (ETag generation).
   * Returns max(updated_at) and count.
   */
  async getListsCollectionVersion(): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    const cacheKey = versionCache.buildCacheKey("task-lists");

    return versionCache.getOrFetch(cacheKey, async () => {
      const [result] = await db
        .select({
          maxUpdatedAt: max(taskListsTable.updatedAt),
          count: count(taskListsTable.id),
        })
        .from(taskListsTable);

      return {
        maxUpdatedAt: result?.maxUpdatedAt ? new Date(result.maxUpdatedAt) : null,
        count: result?.count ?? 0,
      };
    });
  }

  /**
   * Find task list by ID
   */
  async findListById(id: string): Promise<TaskList | undefined> {
    const result = await db.select().from(taskListsTable).where(eq(taskListsTable.id, id)).limit(1);

    return result[0];
  }

  /**
   * Find all task lists
   */
  async findManyLists(filters: TaskListFilterOptions = {}): Promise<TaskList[]> {
    const conditions = [];

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(ilike(taskListsTable.name, searchTerm));
    }

    if (filters.createdById) {
      conditions.push(eq(taskListsTable.createdById, filters.createdById));
    }

    let query = db.select().from(taskListsTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return query.orderBy(asc(taskListsTable.sortOrder), asc(taskListsTable.name));
  }

  /**
   * Create a new task list
   */
  async createList(listData: TaskListNew): Promise<TaskList> {
    const [createdList] = await db
      .insert(taskListsTable)
      .values({
        ...listData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Invalidate version cache
    await versionCache.invalidate("task-lists");

    return createdList;
  }

  /**
   * Update task list by ID
   */
  async updateList(id: string, listData: Partial<TaskListNew>): Promise<TaskList> {
    const [updatedList] = await db
      .update(taskListsTable)
      .set({
        ...listData,
        updatedAt: new Date(),
      })
      .where(eq(taskListsTable.id, id))
      .returning();

    if (!updatedList) {
      throw new Error(`Task list with ID ${id} not found`);
    }

    // Invalidate version cache
    await versionCache.invalidate("task-lists");

    return updatedList;
  }

  /**
   * Delete task list by ID
   */
  async deleteList(id: string): Promise<boolean> {
    const result = await db
      .delete(taskListsTable)
      .where(eq(taskListsTable.id, id))
      .returning({ id: taskListsTable.id });

    const deleted = result.length > 0;

    if (deleted) {
      // Invalidate version cache
      await versionCache.invalidate("task-lists");
    }

    return deleted;
  }

  /**
   * Get task count per list
   */
  async getTaskCounts(): Promise<Record<string, number>> {
    const lists = await this.findManyLists();
    const counts: Record<string, number> = {};

    for (const list of lists) {
      const [result] = await db
        .select({ count: count() })
        .from(tasksTable)
        .where(eq(tasksTable.listId, list.id));
      counts[list.id] = result.count;
    }

    // Also count tasks without a list
    const [unassignedResult] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(isNull(tasksTable.listId));
    counts["unassigned"] = unassignedResult.count;

    return counts;
  }
}
