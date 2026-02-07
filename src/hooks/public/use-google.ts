import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { GoogleAccountStatus } from "@/types/api";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import { PROFILE_QUERY_KEYS } from "@/hooks/public/profile.query-keys";

interface GoogleLinkData {
  accessToken: string;
}

// Re-export for backward compatibility
export type { GoogleAccountStatus } from "@/types/api";

// =============================================================================
// Query Keys
// =============================================================================

export const QUERY_KEYS = {
  all: ["user", "google-account"] as const,
} as const;

// =============================================================================
// Hooks
// =============================================================================

// Fetch Google account status hook
export const useGoogleAccount = () => {
  const t = useTranslations("profile.hooks.google");

  return useQuery<GoogleAccountStatus>({
    queryKey: QUERY_KEYS.all,
    queryFn: async () => {
      const response = await fetch("/api/profile/google-link");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as GoogleAccountStatus;
    },
    initialData: {
      isLinked: false,
      account: null,
    },
  });
};

// Link Google account hook
export const useLinkGoogleAccount = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.google");

  return useMutation({
    mutationFn: async (data: GoogleLinkData) => {
      // First, get user info from Google
      const userInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${data.accessToken}`,
      );

      if (!userInfoResponse.ok) {
        const errorBody = await userInfoResponse.json().catch(() => ({}));
        throw apiErrorFromResponseBody(errorBody, t("errors.userInfoFailed"));
      }

      const userInfo = await userInfoResponse.json();

      // Then link the account
      const response = await fetch("/api/profile/google-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          googleId: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          accessToken: data.accessToken,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.linkFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate Google account status to show linked account
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      // Profile displays linked accounts, so invalidate to update connected services
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.all });
      toast.success(t("linked"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        conflict: t("errors.alreadyLinked"),
        googleLinkedToOther: t("errors.linkedToOther"),
        googleAlreadyLinked: t("errors.alreadyLinked"),
        googleIdRequired: t("errors.idRequired"),
        fallback: t("errors.linkFailed"),
      });
    },
  });
};

// Unlink Google account hook
export const useUnlinkGoogleAccount = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.google");

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/profile/google-link", {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw apiErrorFromResponseBody(result, t("errors.unlinkFailed"));
      }

      return response.json();
    },
    onSuccess: () => {
      // Only invalidate Google account status to show unlinked state
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      // Profile displays linked accounts, so invalidate to update connected services
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.all });
      toast.success(t("unlinked"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        fallback: t("errors.unlinkFailed"),
      });
    },
  });
};
