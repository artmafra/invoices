import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { PaginatedResponse } from "@/types/api";
import type { ActivityEntry, ActivityFilters } from "@/types/common/activity.types";
import { apiErrorFromResponseBody } from "@/lib/api-request-error";
import { ACTIVITY_QUERY_KEYS } from "@/hooks/admin/activity.query-keys";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of activity log chain verification
 */
export interface ChainVerificationResult {
  /** Whether the chain is valid */
  valid: boolean;
  /** Total number of entries in the activity log */
  totalEntries: number;
  /** Number of entries that were checked */
  checkedEntries: number;
  /** Verification mode used */
  mode: "quick" | "full";
  /** Details about where the chain broke (if invalid) */
  brokenAt?: {
    /** ID of the entry where the break was detected */
    id: string;
    /** Sequence number of the broken entry */
    sequenceNumber: number;
    /** Reason for the break */
    reason: "chain_break" | "invalid_signature" | "content_modified";
    /** Expected previous hash (for chain_break) */
    expected?: string;
    /** Actual previous hash found (for chain_break) */
    actual?: string;
  };
}

// Get paginated activity
export const useActivity = (filters: ActivityFilters = {}) => {
  const t = useTranslations("system.hooks.activity");

  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.list(filters),
    queryFn: async (): Promise<PaginatedResponse<ActivityEntry>> => {
      const params = new URLSearchParams();

      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.action) params.append("action", filters.action);
      if (filters.resource) params.append("resource", filters.resource);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.search) params.append("search", filters.search);

      const url = params.toString() ? `/api/admin/activity?${params}` : "/api/admin/activity";

      const response = await fetch(url);

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as PaginatedResponse<ActivityEntry>;
    },
    staleTime: 30 * 1000, // 30 seconds - activity updates frequently
  });
};

// Get available filter options (distinct actions and resources)
export const useActivityFilterOptions = () => {
  const t = useTranslations("system.hooks.activity");

  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.filters(),
    queryFn: async (): Promise<{ actions: string[]; resources: string[] }> => {
      const response = await fetch("/api/admin/activity/filters");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.filtersFailed"));
      }

      return result as { actions: string[]; resources: string[] };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Verify activity log chain integrity
export const useVerifyActivityChain = () => {
  const t = useTranslations("system.hooks.activity");

  return useMutation({
    mutationFn: async (params: {
      mode: "quick" | "full";
      limit?: number;
    }): Promise<ChainVerificationResult> => {
      const response = await fetch("/api/admin/activity/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.verifyFailed"));
      }

      return result as ChainVerificationResult;
    },
  });
};
