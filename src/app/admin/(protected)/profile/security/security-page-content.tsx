"use client";

import Script from "next/script";
import { useTranslations } from "next-intl";
import { useSecurityHandlers } from "@/hooks/public/use-security-handlers";
import { useStepUpAuth } from "@/hooks/public/use-step-up-auth";
import { BackupCodesModal, Email2FASetupModal, Totp2FASetupModal } from "@/components/admin/2fa";
import { AdminHeader } from "@/components/admin/admin-header";
import { ChangePasswordModal } from "@/components/admin/change-password-modal";
import { RecentLoginActivity } from "@/components/admin/login-history";
import { LazyPasskeyListDialog } from "@/components/admin/passkey/lazy-passkey-dialogs";
import { LazyEmailManageDialog } from "@/components/admin/profile/lazy-profile-dialogs";
import { SignInMethodsSection, TwoFactorSection } from "@/components/admin/profile/security";
import { useNonce } from "@/components/nonce-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { StepUpAuthDialog } from "@/components/shared/step-up-auth-dialog";
import { SidebarInset } from "@/components/ui/sidebar";

export function SecurityPageContent() {
  const t = useTranslations("profile.security");
  const tc = useTranslations("common");
  const nonce = useNonce();

  const {
    user,
    isGoogleLinked,
    passkeyCount,
    hasBackupCodes,
    has2FAEnabled,
    isEmailVerified,
    additionalEmailCount,
    hasUnverifiedEmails,
    isGoogleLoading,
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
    disable2FAEmailMutation,
    disable2FATotpMutation,
    regenerateBackupCodesMutation,
    handle2FAEnabled,
    handleDisableEmail2FA,
    handleTOTPEnabled,
    handleDisableTOTP,
    handlePasskeySuccess,
    handleRegenerateBackupCodes,
    handleBackupCodesModalDone,
    handleGoogleConnect,
    handleGoogleDisconnect,
    refetchEmails,
    refetchUserProfile,
  } = useSecurityHandlers();

  const {
    isDialogOpen: isStepUpDialogOpen,
    closeDialog: closeStepUpDialog,
    handleStepUpSuccess,
    hasPassword,
    hasPasskeys: hasPasskeysForStepUp,
    withStepUp,
  } = useStepUpAuth();

  return (
    <SidebarInset>
      <AdminHeader title={t("title")} />
      <PageContainer>
        <PageDescription>{t("description")}</PageDescription>
        <LoadingTransition isLoading={!user} loadingMessage={tc("loading.security")}>
          {user && (
            <>
              <SignInMethodsSection
                email={user.email}
                isEmailVerified={isEmailVerified}
                additionalEmailCount={additionalEmailCount}
                hasUnverifiedEmails={hasUnverifiedEmails}
                isGoogleLinked={isGoogleLinked}
                isGoogleLoading={isGoogleLoading}
                passkeyCount={passkeyCount}
                onManageEmails={() => setIsEmailManageOpen(true)}
                onChangePassword={() => withStepUp(() => setIsPasswordChangeModalOpen(true))}
                onGoogleConnect={() => withStepUp(handleGoogleConnect)}
                onGoogleDisconnect={() => withStepUp(handleGoogleDisconnect)}
                onManagePasskeys={() => withStepUp(() => setIsPasskeyListOpen(true))}
              />

              <TwoFactorSection
                isEmailVerified={isEmailVerified}
                isEmail2FAEnabled={user.twoFactorEnabled}
                isTotpEnabled={user.totpTwoFactorEnabled}
                has2FAEnabled={!!has2FAEnabled}
                hasBackupCodes={hasBackupCodes}
                onEnableEmail2FA={() => withStepUp(() => setIsEnable2FAModalOpen(true))}
                onDisableEmail2FA={() => withStepUp(() => setIsEmail2FADisableDialogOpen(true))}
                onEnableTotp={() => withStepUp(() => setIsTOTPSetupModalOpen(true))}
                onDisableTotp={() => withStepUp(() => setIsTOTPDisableDialogOpen(true))}
                onRegenerateBackupCodes={() =>
                  withStepUp(() => setIsRegenerateCodesDialogOpen(true))
                }
              />

              {/* Recent Login Activity */}
              <RecentLoginActivity limit={3} />

              {/* Email Manage Dialog */}
              <LazyEmailManageDialog
                open={isEmailManageOpen}
                onOpenChange={setIsEmailManageOpen}
                onSuccess={() => {
                  refetchEmails();
                  refetchUserProfile();
                }}
              />

              {/* Email 2FA Setup Modal */}
              {isEnable2FAModalOpen && (
                <Email2FASetupModal
                  isOpen={isEnable2FAModalOpen}
                  onClose={() => setIsEnable2FAModalOpen(false)}
                  userEmail={user.email}
                  onEnabled={handle2FAEnabled}
                />
              )}

              {/* Email 2FA Disable Confirmation Dialog */}
              <ConfirmDialog
                open={isEmail2FADisableDialogOpen}
                onOpenChange={setIsEmail2FADisableDialogOpen}
                title={t("twoFactor.disableEmail.title")}
                description={t("twoFactor.disableEmail.description")}
                confirmText={tc("buttons.disable")}
                variant="destructive"
                onConfirm={handleDisableEmail2FA}
                loading={disable2FAEmailMutation.isPending}
              />

              {/* Change Password Modal */}
              {isPasswordChangeModalOpen && (
                <ChangePasswordModal
                  isOpen={isPasswordChangeModalOpen}
                  onClose={() => setIsPasswordChangeModalOpen(false)}
                  onSuccess={() => {
                    // Optional: Add any additional success handling if needed
                  }}
                />
              )}

              {/* TOTP Setup Modal */}
              {isTOTPSetupModalOpen && (
                <Totp2FASetupModal
                  open={isTOTPSetupModalOpen}
                  onOpenChange={setIsTOTPSetupModalOpen}
                  onSuccess={handleTOTPEnabled}
                />
              )}

              {/* TOTP Disable Confirmation Dialog */}
              <ConfirmDialog
                open={isTOTPDisableDialogOpen}
                onOpenChange={setIsTOTPDisableDialogOpen}
                title={t("twoFactor.disableTotp.title")}
                description={t("twoFactor.disableTotp.description")}
                confirmText={tc("buttons.disable")}
                variant="destructive"
                onConfirm={handleDisableTOTP}
                loading={disable2FATotpMutation.isPending}
              />

              {/* Passkey List Dialog */}
              <LazyPasskeyListDialog
                open={isPasskeyListOpen}
                onOpenChange={setIsPasskeyListOpen}
                onSuccess={handlePasskeySuccess}
              />

              {/* Regenerate Backup Codes Confirmation Dialog */}
              <ConfirmDialog
                open={isRegenerateCodesDialogOpen}
                onOpenChange={setIsRegenerateCodesDialogOpen}
                title={t("recoveryCodes.regenerate.title")}
                description={t("recoveryCodes.regenerate.description")}
                confirmText={t("recoveryCodes.regenerateButton")}
                variant="destructive"
                onConfirm={handleRegenerateBackupCodes}
                loading={regenerateBackupCodesMutation.isPending}
              />

              {/* Backup Codes Modal */}
              {isBackupCodesModalOpen && (
                <BackupCodesModal
                  open={isBackupCodesModalOpen}
                  onOpenChange={setIsBackupCodesModalOpen}
                  backupCodes={regeneratedCodes}
                  onDone={handleBackupCodesModalDone}
                />
              )}

              {/* Step-Up Authentication Dialog */}
              {isStepUpDialogOpen && (
                <StepUpAuthDialog
                  open={isStepUpDialogOpen}
                  onOpenChange={closeStepUpDialog}
                  onSuccess={handleStepUpSuccess}
                  hasPassword={hasPassword}
                  hasPasskeys={hasPasskeysForStepUp}
                />
              )}
            </>
          )}
        </LoadingTransition>
      </PageContainer>

      {/* Google Identity Services - loaded only on this page for account linking */}
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" nonce={nonce} />
    </SidebarInset>
  );
}
