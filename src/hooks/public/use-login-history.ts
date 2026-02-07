import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type {
  LoginHistoryListResponse,
  LoginHistoryResponse,
  RecentLoginHistoryResponse,
} from "@/types/auth/login-history.types";
import { apiErrorFromResponseBody } from "@/lib/api-request-error";
import type { GetLoginHistoryQuery } from "@/validations/login-history.validations";
import { LOGIN_HISTORY_QUERY_KEYS } from "@/hooks/public/login-history.query-keys";

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch current user's login history with pagination and filters
 */
export const useLoginHistory = (filters: GetLoginHistoryQuery = {}) => {
  const t = useTranslations("profile.hooks.loginHistory");

  return useQuery({
    queryKey: LOGIN_HISTORY_QUERY_KEYS.list(filters),
    queryFn: async (): Promise<LoginHistoryListResponse> => {
      const params = new URLSearchParams();

      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
      if (filters.search) params.set("search", filters.search);
      if (filters.success !== undefined) params.set("success", String(filters.success));
      if (filters.startDate) params.set("startDate", filters.startDate.toISOString());
      if (filters.endDate) params.set("endDate", filters.endDate.toISOString());
      if (filters.authMethod) params.set("authMethod", filters.authMethod);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

      const url = `/api/profile/login-history${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as LoginHistoryListResponse;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook to fetch recent login activity (last N entries)
 */
export const useRecentLoginActivity = (limit: number = 5) => {
  const t = useTranslations("profile.hooks.loginHistory");

  return useQuery({
    queryKey: LOGIN_HISTORY_QUERY_KEYS.recent(limit),
    queryFn: async (): Promise<RecentLoginHistoryResponse> => {
      const response = await fetch(`/api/profile/login-history?recent=true&limit=${limit}`);
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as RecentLoginHistoryResponse;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Re-export type for convenience
export type { LoginHistoryResponse };
