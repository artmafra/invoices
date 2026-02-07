"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, MoreVertical, Plus, Send, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { addUserEmailSchema } from "@/validations/profile.validations";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface EmailItem {
  id: string;
  email: string;
  isPrimary: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface EmailManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EmailManageDialog({ open, onOpenChange, onSuccess }: EmailManageDialogProps) {
  const t = useTranslations("profile.security.emails");
  const tc = useTranslations("common");

  // State
  const [isAddEmailOpen, setIsAddEmailOpen] = useState(false);
  const [isVerifyEmailOpen, setIsVerifyEmailOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [isPrimaryConfirmOpen, setIsPrimaryConfirmOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
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

  // Map from API response format
  const emailList: EmailItem[] = emailsData?.emails ?? [];

  // Form
  const addEmailForm = useForm<z.infer<typeof addUserEmailSchema>>({
    resolver: zodResolver(addUserEmailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Handlers
  const handleOpenAddEmail = () => {
    withStepUp(() => setIsAddEmailOpen(true));
  };

  const handleAddEmailClose = () => {
    setIsAddEmailOpen(false);
    addEmailForm.reset();
  };

  const handleAddEmailSubmit = async (data: z.infer<typeof addUserEmailSchema>) => {
    try {
      const result = await addEmailMutation.mutateAsync({ email: data.email });
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
      handleVerifyEmailClose();
      refetch();
      onSuccess?.();
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
      onSuccess?.();
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
      onSuccess?.();
    } catch {
      // Error toast shown by mutation's onError
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("manageDialog.title")}</DialogTitle>
            <DialogDescription>{t("manageDialog.description")}</DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-section">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : emailList.length === 0 ? (
              <EmptyState title={t("noEmails")} asCard={false} padding="medium" />
            ) : (
              <div className="divide-y divide-border">
                {emailList.map((email) => (
                  <div key={email.id} className="flex items-center justify-between gap-space-md py-space-md">
                    <div className="flex items-center gap-space-md min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 space-y-space-xs">
                        <p className="truncate text-sm font-medium">{email.email}</p>
                        <div className="flex flex-wrap items-center gap-space-sm">
                          {email.verifiedAt ? (
                            <Badge variant="success" className="text-xs">
                              {tc("status.verified")}
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-xs">
                              {tc("status.unverified")}
                            </Badge>
                          )}

                          {email.isPrimary && (
                            <Badge variant="default" className="text-xs">
                              {t("badges.primary")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-space-xs">
                      {(!email.isPrimary || !email.verifiedAt) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">{t("actions.more")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!email.verifiedAt && (
                              <DropdownMenuItem onClick={() => handleSendVerification(email)}>
                                <Send className="h-4 w-4" />
                                {t("actions.verify")}
                              </DropdownMenuItem>
                            )}
                            {email.verifiedAt && !email.isPrimary && (
                              <DropdownMenuItem onClick={() => handleSetPrimaryClick(email)}>
                                <Star className="h-4 w-4" />
                                {t("actions.makePrimary")}
                              </DropdownMenuItem>
                            )}
                            {!email.isPrimary && <DropdownMenuSeparator />}
                            {!email.isPrimary && (
                              <DropdownMenuItem
                                onClick={() => handleRemoveClick(email)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                {t("actions.remove")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button onClick={handleOpenAddEmail}>
              <Plus className="h-4 w-4" />
              {t("actions.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Email Dialog */}
      <Dialog open={isAddEmailOpen} onOpenChange={setIsAddEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addDialog.title")}</DialogTitle>
            <DialogDescription>{t("addDialog.description")}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Form {...addEmailForm}>
              <form id="add-email-form" onSubmit={addEmailForm.handleSubmit(handleAddEmailSubmit)}>
                <FormField
                  control={addEmailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("addDialog.emailLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder={t("addDialog.emailPlaceholder")}
                          autoComplete="email"
                          autoFocus
                        />
                      </FormControl>
                      <FormDescription>{t("addDialog.emailHint")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleAddEmailClose}>
              {tc("buttons.cancel")}
            </Button>
            <LoadingButton
              type="submit"
              form="add-email-form"
              loading={addEmailMutation.isPending}
              loadingText={tc("loading.adding")}
            >
              {t("actions.add")}
            </LoadingButton>
          </DialogFooter>
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
          <DialogBody>
            <form id="verify-email-form" onSubmit={handleVerifyEmailSubmit}>
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {t("verifyDialog.resend")}
                </Button>
              </div>
            </form>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleVerifyEmailClose}>
              {tc("buttons.cancel")}
            </Button>
            <LoadingButton
              type="submit"
              form="verify-email-form"
              loading={verifyEmailMutation.isPending}
              loadingText={tc("loading.verifying")}
            >
              {tc("buttons.verify")}
            </LoadingButton>
          </DialogFooter>
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
