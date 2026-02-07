import type { TaskPriority, TaskStatus } from "@/schema/tasks.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import type { PaginatedResult } from "@/storage/types";
import type { ChecklistItem } from "@/validations/task.validations";

// =============================================================================
// Types
// =============================================================================

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  listId: string | null;
  assigneeId: string | null;
  createdById: string | null;
  sortOrder: number;
  completedAt: string | null;
  checklistItems: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

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

export interface TaskFilters {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  listId?: string | null;
  assigneeId?: string;
  includeCompleted?: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  listId?: string | null;
  assigneeId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  listId?: string | null;
  assigneeId?: string | null;
  sortOrder?: number;
}

export interface TaskList {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListWithCount extends TaskList {
  taskCount: number;
}

export interface CreateTaskListInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateTaskListInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: number;
}

// =============================================================================
// Query Keys
// =============================================================================

export const QUERY_KEYS = {
  all: ["admin", "tasks"] as const,
  lists: () => [...QUERY_KEYS.all, "list"] as const,
  list: (filters: TaskFilters, page: number, limit: number) =>
    [...QUERY_KEYS.lists(), filters, page, limit] as const,
  detail: (taskId: string) => [...QUERY_KEYS.all, taskId] as const,
  taskLists: {
    all: ["admin", "tasks", "lists"] as const,
    detail: (listId: string) => [...QUERY_KEYS.taskLists.all, listId] as const,
  },
} as const;

// Legacy exports for backward compatibility
export const TASK_LISTS_QUERY_KEY = QUERY_KEYS.taskLists.all;
export const TASKS_QUERY_KEY = QUERY_KEYS.all;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get paginated tasks
 */
export const useTasks = (filters: TaskFilters = {}, page: number = 1, limit: number = 20) => {
  const t = useTranslations("apps/tasks");

  return useQuery({
    queryKey: QUERY_KEYS.list(filters, page, limit),
    queryFn: async (): Promise<PaginatedResult<TaskWithRelations>> => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.listId !== undefined) {
        params.set("listId", filters.listId === null ? "null" : filters.listId);
      }
      if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
      if (filters.includeCompleted) params.set("includeCompleted", "true");

      const response = await fetch(`/api/admin/tasks?${params.toString()}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchFailed"));
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - mutations invalidate this
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get a single task by ID
 */
export const useTask = (taskId: string) => {
  const t = useTranslations("apps/tasks");

  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, taskId],
    queryFn: async (): Promise<TaskWithRelations> => {
      const response = await fetch(`/api/admin/tasks/${taskId}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchOneFailed"));
      }

      return response.json();
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
};

/**
 * Create a new task
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/tasks");

  return useMutation({
    mutationFn: async (data: CreateTaskInput): Promise<Task> => {
      const response = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("hooks.createFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate task lists to show new task
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      // Cross-domain: Task counts displayed in task lists sidebar
      queryClient.invalidateQueries({ queryKey: TASK_LISTS_QUERY_KEY });
      toast.success(t("success.created"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.createFailed") });
    },
  });
};

/**
 * Update a task
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/tasks");

  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateTaskInput;
    }): Promise<Task> => {
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("hooks.updateFailed"));
      }

      return result;
    },
    onMutate: async ({ taskId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.lists() });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.detail(taskId) });

      // Snapshot the previous values
      const previousLists = queryClient.getQueriesData({ queryKey: QUERY_KEYS.lists() });
      const previousDetail = queryClient.getQueryData(QUERY_KEYS.detail(taskId));

      // Optimistically update the cache
      const updates = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueriesData(
        { queryKey: QUERY_KEYS.lists() },
        (old: PaginatedResult<TaskWithRelations> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((task) => {
              if (task.id !== taskId) return task;
              // Compute completedAt based on status change
              const completedAt =
                data.status === "done" && !task.completedAt
                  ? new Date().toISOString()
                  : data.status && data.status !== "done"
                    ? null
                    : task.completedAt;
              return { ...task, ...updates, completedAt };
            }),
          };
        },
      );

      // Update detail cache
      queryClient.setQueryData(QUERY_KEYS.detail(taskId), (old: TaskWithRelations | undefined) => {
        if (!old) return old;
        // Compute completedAt based on status change
        const completedAt =
          data.status === "done" && !old.completedAt
            ? new Date().toISOString()
            : data.status && data.status !== "done"
              ? null
              : old.completedAt;
        return { ...old, ...updates, completedAt };
      });

      return { previousLists, previousDetail };
    },
    onError: (error: Error, { taskId }, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(QUERY_KEYS.detail(taskId), context.previousDetail);
      }
      handleMutationError(error, { fallback: t("hooks.updateFailed") });
    },
    onSuccess: () => {
      toast.success(t("success.updated"));
    },
    onSettled: (_, __, { taskId }) => {
      // Always invalidate after mutation completes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(taskId) });
      // Cross-domain: Task status affects list counts in sidebar
      queryClient.invalidateQueries({ queryKey: TASK_LISTS_QUERY_KEY });
    },
  });
};

/**
 * Delete a task
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/tasks");

  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw apiErrorFromResponseBody(result, t("hooks.deleteFailed"));
      }
    },
    onSuccess: () => {
      // Only invalidate task lists to remove deleted task
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      // Cross-domain: Task deletion changes list counts
      queryClient.invalidateQueries({ queryKey: TASK_LISTS_QUERY_KEY });
      toast.success(t("success.deleted"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.deleteFailed") });
    },
  });
};

// =============================================================================
// Task Lists Hooks
// =============================================================================

/**
 * Get all task lists with counts
 */
export const useTaskLists = () => {
  const t = useTranslations("apps/tasks");

  return useQuery({
    queryKey: QUERY_KEYS.taskLists.all,
    queryFn: async (): Promise<TaskListWithCount[]> => {
      const response = await fetch("/api/admin/tasks/lists");

      if (!response.ok) {
        throw apiErrorFromResponseBody(await response.json(), t("hooks.lists.fetchFailed"));
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - mutations invalidate this
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get a single task list by ID
 */
export const useTaskList = (listId: string) => {
  const t = useTranslations("apps/tasks");

  return useQuery({
    queryKey: QUERY_KEYS.taskLists.detail(listId),
    queryFn: async (): Promise<TaskList> => {
      const response = await fetch(`/api/admin/tasks/lists/${listId}`);

      if (!response.ok) {
        throw apiErrorFromResponseBody(await response.json(), t("hooks.lists.fetchFailed"));
      }

      return response.json();
    },
    enabled: !!listId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Create a new task list
 */
export const useCreateTaskList = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/tasks");

  return useMutation({
    mutationFn: async (data: CreateTaskListInput): Promise<TaskList> => {
      const response = await fetch("/api/admin/tasks/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("hooks.lists.createFailed"));
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_LISTS_QUERY_KEY });
      toast.success(t("hooks.lists.created"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.lists.createFailed") });
    },
  });
};

/**
 * Update a task list
 */
export const useUpdateTaskList = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/tasks");

  return useMutation({
    mutationFn: async ({
      listId,
      data,
    }: {
      listId: string;
      data: UpdateTaskListInput;
    }): Promise<TaskList> => {
      const response = await fetch(`/api/admin/tasks/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("hooks.lists.updateFailed"));
      }

      return result;
    },
    onMutate: async ({ listId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: TASK_LISTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.taskLists.detail(listId) });

      // Snapshot the previous values
      const previousLists = queryClient.getQueryData(TASK_LISTS_QUERY_KEY);
      const previousDetail = queryClient.getQueryData(QUERY_KEYS.taskLists.detail(listId));

      // Optimistically update the cache
      const updates = { ...data, updatedAt: new Date().toISOString() };

      queryClient.setQueryData(TASK_LISTS_QUERY_KEY, (old: TaskListWithCount[] | undefined) => {
        return old?.map((list) => (list.id === listId ? { ...list, ...updates } : list));
      });

      // Update detail cache
      queryClient.setQueryData(QUERY_KEYS.taskLists.detail(listId), (old: TaskList | undefined) => {
        return old ? { ...old, ...updates } : old;
      });

      return { previousLists, previousDetail };
    },
    onError: (error: Error, { listId }, context) => {
      // Rollback on error
      if (context?.previousLists) {
        queryClient.setQueryData(TASK_LISTS_QUERY_KEY, context.previousLists);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(QUERY_KEYS.taskLists.detail(listId), context.previousDetail);
      }
      handleMutationError(error, { fallback: t("hooks.lists.updateFailed") });
    },
    onSuccess: () => {
      toast.success(t("hooks.lists.updated"));
    },
    onSettled: (_, __, { listId }) => {
      // Always invalidate after mutation completes
      queryClient.invalidateQueries({ queryKey: TASK_LISTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taskLists.detail(listId) });
    },
  });
};

/**
 * Delete a task list
 */
export const useDeleteTaskList = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/tasks");

  return useMutation({
    mutationFn: async (listId: string): Promise<void> => {
      const response = await fetch(`/api/admin/tasks/lists/${listId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw apiErrorFromResponseBody(result, t("hooks.lists.deleteFailed"));
      }
    },
    onSuccess: () => {
      // Only invalidate task lists
      queryClient.invalidateQueries({ queryKey: TASK_LISTS_QUERY_KEY });
      // Cross-domain: Task list deletion affects tasks with that listId
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success(t("hooks.lists.deleted"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.lists.deleteFailed") });
    },
  });
};
