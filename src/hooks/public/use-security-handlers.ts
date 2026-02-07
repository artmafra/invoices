"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  use2FAStatus,
  useDisable2FAEmail,
  useDisable2FATotp,
  useRegenerateBackupCodes,
} from "@/hooks/public/use-2fa";
import { useLinkGoogleAccount, useUnlinkGoogleAccount } from "@/hooks/public/use-google";
import { usePasskeys } from "@/hooks/public/use-passkey";
import { useUserProfile } from "@/hooks/public/use-profile";
import { useUserEmails } from "@/hooks/public/use-user-emails";

export function useSecurityHandlers() {
  const router = useRouter();
  const t = useTranslations("profile.security");

  // Data hooks
  const { data: user, refetch: refetchUserProfile } = useUserProfile();
  const { data: passkeys, refetch: refetchPasskeys } = usePasskeys();
  const { data: emailsData, refetch: refetchEmails } = useUserEmails();
  const { data: twoFactorStatus, refetch: refetch2FAStatus } = use2FAStatus();

  // Mutation hooks
  const disable2FAEmailMutation = useDisable2FAEmail();
  const disable2FATotpMutation = useDisable2FATotp();
  const regenerateBackupCodesMutation = useRegenerateBackupCodes();
  const linkGoogleMutation = useLinkGoogleAccount();
  const unlinkGoogleMutation = useUnlinkGoogleAccount();

  // Modal states
  const [isEmailManageOpen, setIsEmailManageOpen] = useState(false);
  const [isEnable2FAModalOpen, setIsEnable2FAModalOpen] = useState(false);
  const [isEmail2FADisableDialogOpen, setIsEmail2FADisableDialogOpen] = useState(false);
  const [isTOTPSetupModalOpen, setIsTOTPSetupModalOpen] = useState(false);
  const [isTOTPDisableDialogOpen, setIsTOTPDisableDialogOpen] = useState(false);
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPasskeyListOpen, setIsPasskeyListOpen] = useState(false);
  const [isRegenerateCodesDialogOpen, setIsRegenerateCodesDialogOpen] = useState(false);
  const [isBackupCodesModalOpen, setIsBackupCodesModalOpen] = useState(false);
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[]>([]);

  // Derived state
  const isGoogleLinked = user?.hasGoogleLinked ?? false;
  const passkeyCount = passkeys?.length ?? 0;
  const hasBackupCodes = (twoFactorStatus?.backupCodesCount ?? 0) > 0;
  const has2FAEnabled = user?.twoFactorEnabled || user?.totpTwoFactorEnabled;
  const isEmailVerified = !!user?.emailVerified;

  const emailList = emailsData?.emails ?? [];
  const additionalEmailCount = Math.max(0, emailList.length - 1);
  const hasUnverifiedEmails = emailList.some((e) => !e.verifiedAt);

  // Handlers
  const handle2FAEnabled = () => {
    router.refresh();
  };

  const handleDisableEmail2FA = async () => {
    try {
      await disable2FAEmailMutation.mutateAsync();
      setIsEmail2FADisableDialogOpen(false);
      router.refresh();
    } catch {
      // Error toast shown by mutation's onError
    }
  };

  const handleTOTPEnabled = () => {
    router.refresh();
  };

  const handleDisableTOTP = async () => {
    try {
      await disable2FATotpMutation.mutateAsync();
      setIsTOTPDisableDialogOpen(false);
      router.refresh();
    } catch {
      // Error toast shown by mutation's onError
    }
  };

  const handlePasskeySuccess = () => {
    refetchPasskeys();
    refetchUserProfile();
    router.refresh();
  };

  const handleRegenerateBackupCodes = async () => {
    try {
      const result = await regenerateBackupCodesMutation.mutateAsync();
      setIsRegenerateCodesDialogOpen(false);
      setRegeneratedCodes(result.backupCodes);
      setIsBackupCodesModalOpen(true);
      refetch2FAStatus();
    } catch {
      // Error toast shown by mutation's onError
    }
  };

  const handleBackupCodesModalDone = () => {
    setRegeneratedCodes([]);
    toast.success(t("recoveryCodes.regenerated"));
  };

  const handleGoogleConnect = async () => {
    setIsGoogleLoading(true);

    try {
      if (typeof window === "undefined" || !window.google) {
        throw new Error(t("google.notAvailable"));
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID || "",
        scope: "email profile",
        callback: async (response: any) => {
          try {
            if (response.error) {
              throw new Error(response.error);
            }

            await linkGoogleMutation.mutateAsync({
              accessToken: response.access_token,
            });

            router.refresh();
          } catch {
            // Error toast shown by mutation's onError
          } finally {
            setIsGoogleLoading(false);
          }
        },
      });

      client.requestAccessToken();
    } catch {
      toast.error(t("google.linkFailed"));
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    setIsGoogleLoading(true);

    try {
      await unlinkGoogleMutation.mutateAsync();
      router.refresh();
    } catch {
      // Error toast shown by mutation's onError
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return {
    user,
    isGoogleLinked,
    passkeyCount,
    hasBackupCodes,
    has2FAEnabled,
    isEmailVerified,
    additionalEmailCount,
    hasUnverifiedEmails,
    isGoogleLoading,
    // Modal states
    isEmailManageOpen,
    setIsEmailManageOpen,
    isEnable2FAModalOpen,
    setIsEnable2FAModalOpen,
    isEmail2FADisableDialogOpen,
    setIsEmail2FADisableDialogOpen,
    isTOTPSetupModalOpen,
    setIsTOTPSetupModalOpen,
    isTOTPDisableDialogOpen,
    setIsTOTPDisableDialogOpen,
    isPasswordChangeModalOpen,
    setIsPasswordChangeModalOpen,
    isPasskeyListOpen,
    setIsPasskeyListOpen,
    isRegenerateCodesDialogOpen,
    setIsRegenerateCodesDialogOpen,
    isBackupCodesModalOpen,
    setIsBackupCodesModalOpen,
    regeneratedCodes,
    // Mutation states
    disable2FAEmailMutation,
    disable2FATotpMutation,
    regenerateBackupCodesMutation,
    // Handlers
    handle2FAEnabled,
    handleDisableEmail2FA,
    handleTOTPEnabled,
    handleDisableTOTP,
    handlePasskeySuccess,
    handleRegenerateBackupCodes,
    handleBackupCodesModalDone,
    handleGoogleConnect,
    handleGoogleDisconnect,
    // Refetch functions
    refetchEmails,
    refetchUserProfile,
  };
}

// Extend Window interface for Google APIs
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}
