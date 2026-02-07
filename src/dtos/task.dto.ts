import type { TaskList } from "@/schema/task-lists.schema";
import type { Task } from "@/schema/tasks.schema";
import type {
  AdminTaskResponse,
  AdminTasksListResponse,
  TaskListResponse,
  TaskListsResponse,
} from "@/types/tasks/tasks.types";
import type { TaskWithRelations } from "@/storage/task.storage";
import type { PaginatedResult } from "@/storage/types";
import { serializeDate, transformPaginatedResult } from "./base-dto.helper";

/**
 * Task DTO
 * Transforms raw Task entities to API response shapes
 */
export class TaskDTO {
  /**
   * Transform raw Task entity to admin API response
   */
  static toAdminResponse(task: Task): Omit<AdminTaskResponse, "assignee" | "createdBy" | "list"> {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      listId: task.listId,
      assigneeId: task.assigneeId,
      createdById: task.createdById,
      dueDate: serializeDate(task.dueDate),
      completedAt: serializeDate(task.completedAt),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  /**
   * Transform TaskWithRelations to detailed admin response
   */
  static toAdminDetailResponse(task: TaskWithRelations): AdminTaskResponse {
    return {
      ...this.toAdminResponse(task),
      assignee: task.assignee,
      createdBy: task.createdBy,
      list: task.list,
    };
  }

  /**
   * Transform paginated result to admin list response
   */
  static toPaginatedResponse(result: PaginatedResult<TaskWithRelations>): AdminTasksListResponse {
    return transformPaginatedResult(result, (task) => this.toAdminDetailResponse(task));
  }

  // =============================================================================
  // Task Lists Methods
  // =============================================================================

  /**
   * Transform raw TaskList entity with task count to API response
   */
  static toListResponse(list: TaskList, taskCount: number = 0): TaskListResponse {
    return {
      id: list.id,
      name: list.name,
      description: list.description,
      color: list.color,
      sortOrder: list.sortOrder,
      createdById: list.createdById,
      taskCount,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
    };
  }

  /**
   * Transform array of TaskLists with counts to response
   */
  static toListsResponse(lists: Array<TaskList & { taskCount: number }>): TaskListsResponse {
    return lists.map((list) => this.toListResponse(list, list.taskCount));
  }
}
