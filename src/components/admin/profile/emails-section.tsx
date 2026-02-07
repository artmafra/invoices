"use client";

import { useState } from "react";
import { Check, Clock, Loader2, Mail, MoreVertical, Send, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useStepUpAuth } from "@/hooks/public/use-step-up-auth";
import {
  useAddUserEmail,
  useRemoveUserEmail,
  useSendEmailVerification,
  useSetPrimaryEmail,
  useUserEmails,
  useVerifyUserEmail,
} from "@/hooks/public/use-user-emails";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingButton } from "@/components/shared/loading-button";
import { StepUpAuthDialog } from "@/components/shared/step-up-auth-dialog";
import { VerificationCodeInput } from "@/components/shared/verification-code-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Section,
  SectionContent,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "@/components/ui/section";

// Map the API response format to a flattened format for UI
interface EmailItem {
  id: string;
  email: string;
  isPrimary: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export function EmailsSection() {
  const t = useTranslations("profile.security.emails");
  const tc = useTranslations("common");

  // State
  const [isAddEmailOpen, setIsAddEmailOpen] = useState(false);
  const [isVerifyEmailOpen, setIsVerifyEmailOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [isPrimaryConfirmOpen, setIsPrimaryConfirmOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  // Step-up auth
  const {
    isDialogOpen: isStepUpDialogOpen,
    closeDialog: closeStepUpDialog,
    handleStepUpSuccess,
    hasPassword,
    hasPasskeys,
    withStepUp,
  } = useStepUpAuth();

  // Queries and mutations
  const { data: emailsData, isLoading, refetch } = useUserEmails();
  const addEmailMutation = useAddUserEmail();
  const sendVerificationMutation = useSendEmailVerification();
  const verifyEmailMutation = useVerifyUserEmail();
  const removeEmailMutation = useRemoveUserEmail();
  const setPrimaryMutation = useSetPrimaryEmail();

  // Handlers
  const handleOpenAddEmail = () => {
    withStepUp(() => setIsAddEmailOpen(true));
  };

  const handleAddEmailClose = () => {
    setIsAddEmailOpen(false);
    setNewEmail("");
  };

  const handleAddEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.trim()) {
      toast.error(t("errors.emptyEmail"));
      return;
    }

    try {
      const result = await addEmailMutation.mutateAsync({ email: newEmail });
      handleAddEmailClose();
      // Open verification dialog for the newly added email
      setSelectedEmail({
        id: result.email.id,
        email: result.email.email,
        isPrimary: result.email.isPrimary,
        verifiedAt: result.email.verifiedAt,
        createdAt: result.email.createdAt,
      });
      setIsVerifyEmailOpen(true);
    } catch {
      // Error toast shown by mutation's onError
    }
  };

  const handleSendVerification = async (email: EmailItem) => {
    try {
      await sendVerificationMutation.mutateAsync(email.id);
      // Toast is shown by the hook's onSuccess
      setSelectedEmail(email);
      setIsVerifyEmailOpen(true);
    } catch {
      // Error toast shown by mutation's onError
    }
  };

  const handleVerifyEmailClose = () => {
    setIsVerifyEmailOpen(false);
    setVerificationCode("");
    setSelectedEmail(null);
  };

  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmail || !verificationCode.trim()) {
      toast.error(t("errors.emptyCode"));
      return;
    }

    try {
      await verifyEmailMutation.mutateAsync({
        emailId: selectedEmail.id,
        code: verificationCode,
      });
      // Toast is shown by the hook's onSuccess
      handleVerifyEmailClose();
      refetch();
    } catch {
      // Error toast shown by mutation's onError
    }
  };

  const handleRemoveClick = (email: EmailItem) => {
    setSelectedEmail(email);
    withStepUp(() => setIsRemoveConfirmOpen(true));
  };

  const handleRemoveConfirm = async () => {
    if (!selectedEmail) return;

    try {
      await removeEmailMutation.mutateAsync(selectedEmail.id);
      setIsRemoveConfirmOpen(false);
      setSelectedEmail(null);
      refetch();
    } catch {
      // Error toast shown by mutation's onError
    }
  };

  const handleSetPrimaryClick = (email: EmailItem) => {
    setSelectedEmail(email);
    withStepUp(() => setIsPrimaryConfirmOpen(true));
  };

  const handleSetPrimaryConfirm = async () => {
    if (!selectedEmail) return;

    try {
      await setPrimaryMutation.mutateAsync(selectedEmail.id);
      setIsPrimaryConfirmOpen(false);
      setSelectedEmail(null);
      refetch();
    } catch {
      // Error toast shown by mutation's onError
    }
  };

  // Map from API response format
  const emailList: EmailItem[] = emailsData?.emails ?? [];

  return (
    <>
      <Section>
        <SectionHeader>
          <SectionTitle>{t("title")}</SectionTitle>
          <SectionDescription>{t("description")}</SectionDescription>
        </SectionHeader>
        <SectionContent>
          <Card>
            <CardContent className="space-y-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-section">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : emailList.length === 0 ? (
                <EmptyState title={t("noEmails")} asCard={false} padding="medium" />
              ) : (
                <div className="divide-y divide-border">
                  {emailList.map((email) => (
                    <div
                      key={email.id}
                      className="flex flex-col gap-space-md py-space-lg md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-space-md">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-space-xs">
                          <div className="flex flex-wrap items-center gap-space-sm">
                            <p className="text-sm font-medium">{email.email}</p>
                            {email.isPrimary && (
                              <Badge variant="default" className="text-xs">
                                <Star className="mr-space-xs h-3 w-3" />
                                {t("badges.primary")}
                              </Badge>
                            )}
                            {email.verifiedAt ? (
                              <Badge variant="success" className="text-xs">
                                <Check className="mr-space-xs h-3 w-3" />
                                {tc("status.verified")}
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="text-xs">
                                <Clock className="mr-space-xs h-3 w-3" />
                                {tc("status.unverified")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {email.isPrimary
                              ? t("primaryDescription")
                              : email.verifiedAt
                                ? t("verifiedDescription")
                                : t("unverifiedDescription")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-sm">
                        {!email.verifiedAt && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendVerification(email)}
                            disabled={sendVerificationMutation.isPending}
                          >
                            {sendVerificationMutation.isPending ? (
                              <Loader2 className="mr-space-sm h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-space-sm h-4 w-4" />
                            )}
                            {t("actions.verify")}
                          </Button>
                        )}
                        {!email.isPrimary && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">{t("actions.more")}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {email.verifiedAt && (
                                <DropdownMenuItem onClick={() => handleSetPrimaryClick(email)}>
                                  <Star className="mr-space-sm h-4 w-4" />
                                  {t("actions.makePrimary")}
                                </DropdownMenuItem>
                              )}
                              {email.verifiedAt && <DropdownMenuSeparator />}
                              <DropdownMenuItem
                                onClick={() => handleRemoveClick(email)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-space-sm h-4 w-4" />
                                {t("actions.remove")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Email Button */}
              <div className="border-t border-border pt-space-lg">
                <Button variant="outline" onClick={handleOpenAddEmail}>
                  <Mail className="mr-space-sm h-4 w-4" />
                  {t("actions.add")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </SectionContent>
      </Section>

      {/* Add Email Dialog */}
      <Dialog open={isAddEmailOpen} onOpenChange={setIsAddEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addDialog.title")}</DialogTitle>
            <DialogDescription>{t("addDialog.description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEmailSubmit}>
            <DialogBody>
              <FieldGroup className="w-full md:max-w-sm">
                <Field>
                  <FieldLabel>{t("addDialog.emailLabel")}</FieldLabel>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t("addDialog.emailPlaceholder")}
                    autoComplete="email"
                    autoFocus
                  />
                  <FieldDescription>{t("addDialog.emailHint")}</FieldDescription>
                </Field>
              </FieldGroup>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleAddEmailClose}>
                {tc("buttons.cancel")}
              </Button>
              <LoadingButton
                type="submit"
                loading={addEmailMutation.isPending}
                loadingText={tc("loading.adding")}
              >
                {t("actions.add")}
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verify Email Dialog */}
      <Dialog open={isVerifyEmailOpen} onOpenChange={setIsVerifyEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("verifyDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("verifyDialog.description", { email: selectedEmail?.email ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVerifyEmailSubmit}>
            <DialogBody>
              <FieldGroup>
                <Field>
                  <FieldLabel>{t("verifyDialog.codeLabel")}</FieldLabel>
                  <VerificationCodeInput
                    value={verificationCode}
                    onChange={setVerificationCode}
                    onComplete={setVerificationCode}
                    maxLength={6}
                  />
                </Field>
              </FieldGroup>
              <div className="mt-space-lg">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => selectedEmail && handleSendVerification(selectedEmail)}
                  disabled={sendVerificationMutation.isPending}
                  className="h-auto p-0"
                >
                  {sendVerificationMutation.isPending ? (
                    <Loader2 className="mr-space-sm h-4 w-4 animate-spin" />
                  ) : null}
                  {t("verifyDialog.resend")}
                </Button>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleVerifyEmailClose}>
                {tc("buttons.cancel")}
              </Button>
              <LoadingButton
                type="submit"
                loading={verifyEmailMutation.isPending}
                loadingText={tc("loading.verifying")}
              >
                {tc("buttons.verify")}
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Email Confirmation */}
      <ConfirmDialog
        open={isRemoveConfirmOpen}
        onOpenChange={setIsRemoveConfirmOpen}
        title={t("removeDialog.title")}
        description={t("removeDialog.description", { email: selectedEmail?.email ?? "" })}
        confirmText={t("actions.remove")}
        variant="destructive"
        onConfirm={handleRemoveConfirm}
        loading={removeEmailMutation.isPending}
      />

      {/* Set Primary Confirmation */}
      <ConfirmDialog
        open={isPrimaryConfirmOpen}
        onOpenChange={setIsPrimaryConfirmOpen}
        title={t("primaryDialog.title")}
        description={t("primaryDialog.description", { email: selectedEmail?.email ?? "" })}
        confirmText={t("actions.makePrimary")}
        onConfirm={handleSetPrimaryConfirm}
        loading={setPrimaryMutation.isPending}
      />

      {/* Step-Up Authentication Dialog */}
      <StepUpAuthDialog
        open={isStepUpDialogOpen}
        onOpenChange={closeStepUpDialog}
        onSuccess={handleStepUpSuccess}
        hasPassword={hasPassword}
        hasPasskeys={hasPasskeys}
      />
    </>
  );
}
