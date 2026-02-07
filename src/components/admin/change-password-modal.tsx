"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updatePasswordSchema } from "@/validations/profile.validations";
import { usePasswordValidation } from "@/hooks/public/use-password-policy";
import { useChangePassword } from "@/hooks/public/use-profile";
import { LoadingButton } from "@/components/shared/loading-button";
import { PasswordStrengthIndicator } from "@/components/shared/password-strength-indicator";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const changePasswordMutation = useChangePassword();
  const t = useTranslations("profile.changePassword");
  const tCommon = useTranslations("common.buttons");

  const changePasswordFormSchema = updatePasswordSchema
    .extend({
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("errors.mismatch"),
      path: ["confirmPassword"],
    });

  type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const newPassword = form.watch("newPassword");
  const passwordValidation = usePasswordValidation(newPassword);

  const handlePasswordSubmit = async (data: ChangePasswordFormValues) => {
    // Use password policy validation
    if (passwordValidation && !passwordValidation.valid) {
      // We can set the error on the newPassword field
      form.setError("newPassword", {
        type: "manual",
        message: passwordValidation.errors[0] || t("errors.mismatch"),
      });
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        newPassword: data.newPassword,
      });

      handleClose();
      onSuccess?.();
    } catch {
      // Error toast is handled by the mutation hook
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-sm">
            <Lock className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form {...form}>
            <form id="change-password-form" onSubmit={form.handleSubmit(handlePasswordSubmit)}>
              <DialogDescription className="mb-space-lg">{t("description")}</DialogDescription>
              <div className="flex w-full flex-col gap-space-lg">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("newPassword")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder={t("newPasswordPlaceholder")}
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <PasswordStrengthIndicator validation={passwordValidation} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("confirmPassword")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder={t("confirmPasswordPlaceholder")}
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={changePasswordMutation.isPending}
          >
            {tCommon("cancel")}
          </Button>
          <LoadingButton
            type="submit"
            form="change-password-form"
            loading={changePasswordMutation.isPending}
            loadingText={t("updating")}
          >
            {t("updateButton")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
