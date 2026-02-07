"use client";

import { withPermissionGuard } from "@/lib/mutations/permission-guard";
import type { ChainVerificationResult } from "./use-activity";
import { useVerifyActivityChain } from "./use-activity";
import type { ActivityPermissions } from "./use-resource-permissions";

export interface UseActivityActionsParams {
  permissions: ActivityPermissions & { currentUserId: string | undefined; isLoading: boolean };
  onVerifySuccess?: (result: ChainVerificationResult) => void;
}

/**
 * Hook to manage all activity-related actions and mutations
 */
export function useActivityActions({ permissions, onVerifySuccess }: UseActivityActionsParams) {
  const verifyChainMutation = useVerifyActivityChain();
  /**
   * Verify activity chain handler
   */
  const handleVerifyChain = withPermissionGuard(
    permissions.canVerify,
    "No permission to verify activity chain", // This will be replaced by page-level translation
    async (params: { mode: "quick" | "full"; limit?: number }) => {
      const result = await verifyChainMutation.mutateAsync(params);
      onVerifySuccess?.(result);
      return result;
    },
  );

  return {
    handleVerifyChain,
    isVerifying: verifyChainMutation.isPending,
  };
}
