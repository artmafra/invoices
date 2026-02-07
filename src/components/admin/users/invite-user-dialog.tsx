"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { CreateUserInviteRequest } from "@/types/users/user-invites.types";
import { createInviteSchema } from "@/validations/invite.validations";
import { useUserPermissions } from "@/hooks/admin/use-resource-permissions";
import { useAssignableRoles } from "@/hooks/admin/use-roles";
import { LoadingButton } from "@/components/shared/loading-button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface InviteUserDialogProps {
  open: boolean;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserInviteRequest) => void;
}

export function InviteUserDialog({
  open,
  isLoading,
  onOpenChange,
  onSubmit,
}: InviteUserDialogProps) {
  const t = useTranslations("system.users");
  const tc = useTranslations("common");

  // Self-fetch data (reduces prop drilling)
  const { canViewRoles } = useUserPermissions();
  const { data: roles } = useAssignableRoles(canViewRoles);

  const form = useForm<CreateUserInviteRequest>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      email: "",
      roleId: null,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        email: "",
        roleId: null,
      });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("inviteForm.title")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{t("inviteForm.description")}</DialogDescription>
          <Form {...form}>
            <form
              id="invite-user-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-space-lg"
              noValidate
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inviteForm.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        placeholder={t("inviteForm.emailPlaceholder")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {canViewRoles ? (
                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inviteForm.role")}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                        defaultValue={field.value || "none"}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("inviteForm.rolePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" className="italic">
                            {t("noRole")}
                          </SelectItem>
                          {roles?.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{t("noRoleInvitePermission")}</p>
              )}
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("buttons.cancel")}
          </Button>
          <LoadingButton
            type="submit"
            form="invite-user-form"
            loading={isLoading}
            loadingText={t("inviteForm.sending")}
          >
            {t("inviteForm.sendInvite")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
