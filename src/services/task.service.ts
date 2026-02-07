import { TaskDTO } from "@/dtos/task.dto";
import type { TaskList, TaskListNew } from "@/schema/task-lists.schema";
import type { Task, TaskNew, TaskPriority, TaskStatus } from "@/schema/tasks.schema";
import type {
  AdminTaskResponse,
  AdminTasksListResponse,
  TaskListResponse,
  TaskListsResponse,
} from "@/types/tasks/tasks.types";
import { taskStorage } from "@/storage/runtime/task";
import { type TaskFilterOptions, type TaskListFilterOptions } from "@/storage/task.storage";
import type { PaginationOptions } from "@/storage/types";

/**
 * Task Service
 * Business logic for managing tasks
 */
export class TaskService {
  /**
   * Get task by ID
   */
  async getById(id: string): Promise<Task | null> {
    return (await taskStorage.findById(id)) ?? null;
  }

  /**
   * Get task by ID with relations (returns DTO for API)
   */
  async getByIdWithRelations(id: string): Promise<AdminTaskResponse | null> {
    const task = await taskStorage.findByIdWithRelations(id);
    return task ? TaskDTO.toAdminDetailResponse(task) : null;
  }

  /**
   * Get all tasks
   */
  async getAll(filters?: TaskFilterOptions): Promise<Task[]> {
    return taskStorage.findMany(filters);
  }

  /**
   * Get tasks with pagination (returns DTO for API)
   */
  async getPaginated(
    filters?: TaskFilterOptions,
    options?: PaginationOptions,
  ): Promise<AdminTasksListResponse> {
    const result = await taskStorage.findManyPaginated(filters, options);
    return TaskDTO.toPaginatedResponse(result);
  }

  /**
   * Get collection version for ETag generation.
   */
  async getCollectionVersion(filters?: TaskFilterOptions) {
    return taskStorage.getCollectionVersion(filters);
  }

  /**
   * Create a new task (returns DTO for API)
   */
  async create(data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date;
    listId?: string;
    assigneeId?: string;
    createdById: string;
  }): Promise<AdminTaskResponse> {
    const task = await taskStorage.create({
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "todo",
      priority: data.priority ?? "medium",
      dueDate: data.dueDate ?? null,
      listId: data.listId ?? null,
      assigneeId: data.assigneeId ?? null,
      createdById: data.createdById,
    });

    // Fetch with relations for complete response
    const taskWithRelations = await taskStorage.findByIdWithRelations(task.id);
    return taskWithRelations
      ? TaskDTO.toAdminDetailResponse(taskWithRelations)
      : TaskDTO.toAdminDetailResponse({ ...task, assignee: null, createdBy: null, list: null });
  }

  /**
   * Update a task (returns DTO for API)
   */
  async update(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: Date | null;
      listId?: string | null;
      assigneeId?: string | null;
      sortOrder?: number;
    },
  ): Promise<AdminTaskResponse> {
    const updateData: Partial<TaskNew> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.listId !== undefined) updateData.listId = data.listId;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    await taskStorage.update(id, updateData);

    // Fetch with relations for complete response
    const taskWithRelations = await taskStorage.findByIdWithRelations(id);
    if (!taskWithRelations) {
      throw new Error(`Task ${id} not found after update`);
    }
    return TaskDTO.toAdminDetailResponse(taskWithRelations);
  }

  /**
   * Delete a task
   */
  async delete(id: string): Promise<boolean> {
    return taskStorage.delete(id);
  }

  /**
   * Update task status
   */
  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return taskStorage.updateStatus(id, status);
  }

  /**
   * Assign task to user
   */
  async assignTo(id: string, assigneeId: string | null): Promise<Task> {
    return taskStorage.assignTo(id, assigneeId);
  }

  /**
   * Move task to a list
   */
  async moveToList(id: string, listId: string | null): Promise<Task> {
    return taskStorage.moveToList(id, listId);
  }

  /**
   * Get tasks by list
   */
  async getByList(listId: string | null): Promise<Task[]> {
    return taskStorage.findByList(listId);
  }

  /**
   * Get tasks assigned to a user
   */
  async getByAssignee(userId: string): Promise<Task[]> {
    return taskStorage.findByAssignee(userId);
  }

  /**
   * Get overdue tasks
   */
  async getOverdue(): Promise<Task[]> {
    return taskStorage.findOverdue();
  }

  // =============================================================================
  // Task Lists Methods
  // =============================================================================

  /**
   * Get task list by ID
   */
  async getListById(id: string): Promise<TaskList | null> {
    return (await taskStorage.findListById(id)) ?? null;
  }

  /**
   * Get all task lists
   */
  async getAllLists(filters?: TaskListFilterOptions): Promise<TaskList[]> {
    return taskStorage.findManyLists(filters);
  }

  /**
   * Get all task lists with task counts (returns DTO for API)
   */
  async getAllListsWithCounts(): Promise<TaskListsResponse> {
    const lists = await taskStorage.findManyLists();
    const counts = await taskStorage.getTaskCounts();

    const listsWithCounts = lists.map((list) => ({
      ...list,
      taskCount: counts[list.id] || 0,
    }));

    return TaskDTO.toListsResponse(listsWithCounts);
  }

  /**
   * Get collection version for task lists (ETag generation)
   */
  async getListsCollectionVersion() {
    return taskStorage.getListsCollectionVersion();
  }

  /**
   * Create a new task list (returns DTO for API)
   */
  async createList(data: {
    name: string;
    description?: string;
    color?: string;
    createdById: string;
  }): Promise<TaskListResponse> {
    const list = await taskStorage.createList({
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? null,
      createdById: data.createdById,
    });

    return TaskDTO.toListResponse(list, 0);
  }

  /**
   * Update a task list (returns DTO for API)
   */
  async updateList(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      color?: string | null;
      sortOrder?: number;
    },
  ): Promise<TaskListResponse> {
    const updateData: Partial<TaskListNew> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const list = await taskStorage.updateList(id, updateData);

    // Get current task count
    const counts = await taskStorage.getTaskCounts();
    const taskCount = counts[list.id] || 0;

    return TaskDTO.toListResponse(list, taskCount);
  }

  /**
   * Delete a task list
   */
  async deleteList(id: string): Promise<boolean> {
    return taskStorage.deleteList(id);
  }

  /**
   * Get task counts per list
   */
  async getTaskCounts(): Promise<Record<string, number>> {
    return taskStorage.getTaskCounts();
  }
}
