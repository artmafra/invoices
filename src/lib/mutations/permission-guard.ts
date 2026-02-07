/**
 * Permission guard utilities for mutation handlers
 *
 * Eliminates duplicated permission checks across action hooks
 * by providing a reusable wrapper pattern.
 */

import { toast } from "sonner";

/**
 * Wraps a mutation handler with a permission check.
 *
 * If permission is denied, shows a toast error and returns early.
 * If permission is granted, executes the handler and swallows any errors
 * (assuming mutation hooks already handle them via onError callbacks).
 *
 * @example
 * ```typescript
 * const handleCreate = withPermissionGuard(
 *   permissions.canCreate,
 *   t("errors.noCreatePermission"),
 *   async (data: CreateRequest) => {
 *     await createMutation.mutateAsync(data);
 *     closeDialog();
 *   }
 * );
 * ```
 *
 * @param hasPermission - Boolean indicating if the user has permission
 * @param errorMessage - Message to show if permission is denied
 * @param handler - The mutation handler to execute if permission is granted
 * @returns A wrapped handler that checks permissions before execution
 */
export function withPermissionGuard<TArgs extends unknown[], TReturn>(
  hasPermission: boolean,
  errorMessage: string,
  handler: (...args: TArgs) => TReturn | Promise<TReturn>,
): (...args: TArgs) => Promise<void> {
  return async (...args: TArgs): Promise<void> => {
    if (!hasPermission) {
      toast.error(errorMessage);
      return;
    }

    try {
      await handler(...args);
    } catch {
      // Error is already handled by the mutation hook
    }
  };
}
