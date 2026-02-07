"use client";

import { withPermissionGuard } from "@/lib/mutations/permission-guard";
import type { SessionPermissions } from "./use-resource-permissions";
import type { useRevokeAllUserSessions, useRevokeSession } from "./use-sessions";

export interface UseSessionsActionsParams {
  permissions: SessionPermissions & { currentUserId: string | undefined; isLoading: boolean };
  revokeSessionMutation: ReturnType<typeof useRevokeSession>;
  revokeAllUserSessionsMutation: ReturnType<typeof useRevokeAllUserSessions>;
  onRevokeSuccess?: () => void;
  onRevokeAllSuccess?: () => void;
}

/**
 * Hook to manage all session-related actions and mutations
 */
export function useSessionsActions({
  permissions,
  revokeSessionMutation,
  revokeAllUserSessionsMutation,
  onRevokeSuccess,
  onRevokeAllSuccess,
}: UseSessionsActionsParams) {
  /**
   * Revoke single session handler
   */
  const handleRevokeSession = withPermissionGuard(
    permissions.canRevoke,
    "No permission to revoke sessions", // This will be replaced by page-level translation
    (sessionId: string) => {
      onRevokeSuccess?.();
      revokeSessionMutation.mutate(sessionId);
    },
  );

  /**
   * Revoke all user sessions handler
   */
  const handleRevokeAllUserSessions = withPermissionGuard(
    permissions.canRevoke,
    "No permission to revoke sessions", // This will be replaced by page-level translation
    async (userId: string) => {
      await revokeAllUserSessionsMutation.mutateAsync(userId);
      onRevokeAllSuccess?.();
    },
  );

  return {
    handleRevokeSession,
    handleRevokeAllUserSessions,
    isRevokingSession: revokeSessionMutation.isPending,
    isRevokingAllSessions: revokeAllUserSessionsMutation.isPending,
  };
}
