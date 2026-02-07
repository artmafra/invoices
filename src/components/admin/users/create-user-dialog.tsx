"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { createUserRequestSchema, type CreateUserRequest } from "@/validations/user.validations";
import { useUserPermissions } from "@/hooks/admin/use-resource-permissions";
import { useAssignableRoles } from "@/hooks/admin/use-roles";
import { usePasswordValidation } from "@/hooks/public/use-password-policy";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CreateUserDialogProps {
  open: boolean;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserRequest) => void;
}

export function CreateUserDialog({
  open,
  isLoading,
  onOpenChange,
  onSubmit,
}: CreateUserDialogProps) {
  const t = useTranslations("system.users");
  const tc = useTranslations("common");

  // Self-fetch data (reduces prop drilling)
  const { canViewRoles } = useUserPermissions();
  const { data: roles } = useAssignableRoles(canViewRoles);

  const form = useForm<CreateUserRequest>({
    resolver: zodResolver(createUserRequestSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      roleId: null,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const password = form.watch("password");
  const passwordValidation = usePasswordValidation(password || "");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        email: "",
        name: "",
        password: "",
        roleId: null,
      });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{t("createDescription")}</DialogDescription>
          <Form {...form}>
            <form
              id="create-user-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-space-lg"
              noValidate
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.password")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} value={field.value || ""} />
                    </FormControl>
                    <PasswordStrengthIndicator validation={passwordValidation} />
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
                      <FormLabel>{t("form.role")}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                        defaultValue={field.value || "none"}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("form.rolePlaceholder")} />
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
                <p className="text-sm text-muted-foreground">{t("noRoleAssignPermission")}</p>
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
            form="create-user-form"
            loading={isLoading}
            loadingText={tc("loading.creating")}
          >
            {t("create")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
