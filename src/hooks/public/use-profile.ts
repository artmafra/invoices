import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  RequestEmailChangeRequest,
  UpdatePasswordRequest,
  UpdateProfileRequest,
  UserProfileResponse,
  VerifyEmailChangeRequest,
} from "@/types/users/profile.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import { PROFILE_QUERY_KEYS as QUERY_KEYS } from "@/hooks/public/profile.query-keys";

// =============================================================================
// Types
// =============================================================================

interface AvatarUploadData {
  file: File;
}

// Get user profile hook
export const useUserProfile = () => {
  const t = useTranslations("profile.hooks.profile");

  return useQuery({
    queryKey: QUERY_KEYS.all,
    queryFn: async (): Promise<UserProfileResponse> => {
      const response = await fetch("/api/profile");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as UserProfileResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * User preferences (theme, language, timezone, pagination) are now device-bound,
 * stored in cookies, NOT in the database.
 *
 * For preferences, use @/lib/preferences:
 * - usePreferences() - Context-based hook with SSR-safe state
 *
 * This is intentional:
 * - Logging out does NOT reset preferences
 * - Impersonating another user does NOT change preferences
 * - Preferences follow the device, not the account
 */

// Update profile hook
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.profile");

  return useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.updateFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      toast.success(t("updated"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.checkFields"),
        fallback: t("errors.updateFailed"),
      });
    },
  });
};

// Change password hook
export const useChangePassword = () => {
  const t = useTranslations("profile.hooks.password");

  return useMutation({
    mutationFn: async (data: UpdatePasswordRequest) => {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.changeFailed"));
      }

      return result;
    },
    onSuccess: () => {
      toast.success(t("changed"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.checkFields"),
        fallback: t("errors.changeFailed"),
      });
    },
  });
};

// Change email hook
export const useChangeEmail = () => {
  const t = useTranslations("profile.hooks.email");

  return useMutation({
    mutationFn: async (data: RequestEmailChangeRequest) => {
      const response = await fetch("/api/profile/email-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.initiateFailed"));
      }

      return result;
    },
    onSuccess: () => {
      toast.success(t("verificationSent"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.checkFields"),
        sameEmail: t("errors.sameEmail"),
        emailInUse: t("errors.emailInUse"),
        conflict: t("errors.emailInUse"),
        fallback: t("errors.initiateFailed"),
      });
    },
  });
};

// Verify email change hook
export const useVerifyEmailChange = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.email");

  return useMutation({
    mutationFn: async (data: VerifyEmailChangeRequest) => {
      const response = await fetch("/api/profile/email-change", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.verifyFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch profile to get updated email
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.invalidCode"),
        invalidVerificationCode: t("errors.invalidCode"),
        fallback: t("errors.verifyFailed"),
      });
    },
  });
};

// Cancel email change hook
export const useCancelEmailChange = () => {
  const t = useTranslations("profile.hooks.email");

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/profile/email-change", {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw apiErrorFromResponseBody(result, t("errors.cancelFailed"));
      }

      return response.json();
    },
  });
};

// Upload avatar hook
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.avatar");

  return useMutation({
    mutationFn: async (
      data: AvatarUploadData,
    ): Promise<{
      imageUrl: string;
      metadata?: {
        format: string;
        dimensions: string;
        compressed: boolean;
      };
    }> => {
      const formData = new FormData();
      formData.append("image", data.file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.uploadFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch profile to get updated avatar
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.invalidImage"),
        svgNotAllowed: t("errors.svgNotAllowed"),
        imageTooLarge: t("errors.imageTooLarge"),
        invalidImage: t("errors.invalidImage"),
        notAnImage: t("errors.notAnImage"),
        unsupportedImageFormat: t("errors.unsupportedFormat"),
        invalidImageDimensions: t("errors.invalidDimensions"),
        fallback: t("errors.uploadFailed"),
      });
    },
  });
};

// Delete avatar hook
export const useDeleteAvatar = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.avatar");

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw apiErrorFromResponseBody(result, t("errors.removeFailed"));
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch profile to remove avatar
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
      toast.success(t("removed"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        fallback: t("errors.removeFailed"),
      });
    },
  });
};

// Delete account hook
export const useDeleteAccount = () => {
  const t = useTranslations("profile.hooks.account");

  return useMutation({
    mutationFn: async (password: string) => {
      const response = await fetch("/api/profile/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.deleteFailed"));
      }

      return result;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      // Redirect will be handled by the component
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.incorrectPassword"),
        fallback: t("errors.deleteFailed"),
      });
    },
  });
};

// Send email verification code hook
export const useSendEmailVerification = () => {
  const t = useTranslations("profile.hooks.email");

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/profile/verify-email", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.sendFailed"));
      }

      return result;
    },
    onSuccess: (data) => {
      toast.success(t("codeSent", { email: data.email }));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        emailAlreadyVerified: t("errors.alreadyVerified"),
        fallback: t("errors.sendFailed"),
      });
    },
  });
};

// Verify email hook
export const useVerifyEmail = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.email");

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/profile/verify-email", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.verifyFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate user profile to reflect the email verification status
      queryClient.invalidateQueries({
        queryKey: ["user", "profile"],
      });
      toast.success(t("verified"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.invalidCode"),
        invalidVerificationCode: t("errors.invalidCode"),
        fallback: t("errors.invalidCode"),
      });
    },
  });
};
