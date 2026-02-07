"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppWindow } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { AdminUserResponse } from "@/types/users/users.types";
import { updateUserRequestSchema, type UpdateUserRequest } from "@/validations/user.validations";
import { useAllApps } from "@/hooks/admin/use-modules";
import { useUserPermissions } from "@/hooks/admin/use-resource-permissions";
import { useAssignableRoles } from "@/hooks/admin/use-roles";
import { usePasswordValidation } from "@/hooks/public/use-password-policy";
import { LoadingButton } from "@/components/shared/loading-button";
import { PasswordStrengthIndicator } from "@/components/shared/password-strength-indicator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export interface EditUserDialogProps {
  user: AdminUserResponse | null;
  editAppPermissions: Record<string, string[]>;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateUserRequest) => void;
  onAppPermissionsChange: (permissions: Record<string, string[]>) => void;
}

export function EditUserDialog({
  user,
  editAppPermissions,
  isLoading,
  onClose,
  onSubmit,
  onAppPermissionsChange,
}: EditUserDialogProps) {
  const t = useTranslations("system.users");
  const tc = useTranslations("common");

  // Self-fetch data (reduces prop drilling)
  const { canViewRoles, canManageAppAccess, currentUserId } = useUserPermissions();
  const { data: roles } = useAssignableRoles(canViewRoles);
  const { data: allApps = [] } = useAllApps();

  const isSelf = user?.id === currentUserId;

  const form = useForm<UpdateUserRequest>({
    resolver: zodResolver(updateUserRequestSchema),
    reValidateMode: "onSubmit",
    defaultValues: {
      name: "",
      email: "",
      roleId: null,
      password: "",
    },
  });

  const password = form.watch("password");
  const passwordValidation = usePasswordValidation(password || "");

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email,
        roleId: user.roleId,
        password: "",
      });
    }
  }, [user, form]);

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editUser")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{t("editDescription")}</DialogDescription>
          <Form {...form}>
            <form
              id="edit-user-form"
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
                    {user && field.value !== user.email && (
                      <p className="text-sm text-muted-foreground mt-space-xs">
                        {t("emailChangeWarning")}
                      </p>
                    )}
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
                        disabled={isSelf}
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
                      {isSelf && (
                        <p className="text-sm text-muted-foreground mt-space-xs">
                          {t("cannotChangeOwnRole")}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{t("noRolePermission")}</p>
              )}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.newPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        value={field.value || ""}
                        placeholder={t("form.passwordKeep")}
                      />
                    </FormControl>
                    <PasswordStrengthIndicator validation={passwordValidation} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* App Permissions Section */}
              {canManageAppAccess && allApps.length > 0 && (
                <div className="space-y-space-sm">
                  <div className="flex items-center gap-space-sm font-medium text-sm">
                    <AppWindow className="h-4 w-4" />
                    {t("appPermissions")}
                  </div>
                  <div className="space-y-space-lg mt-space-sm">
                    {allApps.map((app) => {
                      const appPerms = editAppPermissions[app.slug] ?? [];
                      const hasAccess = appPerms.includes("view");
                      const otherPermissions = app.permissions.filter(
                        (p: { action: string }) => p.action !== "view",
                      );

                      return (
                        <div key={app.slug} className="border rounded-lg p-space-md">
                          {/* App Access Toggle */}
                          <div className="flex items-center space-x-space-sm mb-space-sm">
                            <Checkbox
                              id={`app-access-${app.slug}`}
                              checked={hasAccess}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // Grant view permission
                                  const existing = editAppPermissions[app.slug] ?? [];
                                  onAppPermissionsChange({
                                    ...editAppPermissions,
                                    [app.slug]: [...existing, "view"],
                                  });
                                } else {
                                  // Remove all permissions for this app
                                  const { [app.slug]: _, ...rest } = editAppPermissions;
                                  onAppPermissionsChange(rest);
                                }
                              }}
                              disabled={isSelf}
                            />
                            <label
                              htmlFor={`app-access-${app.slug}`}
                              className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {app.name}
                            </label>
                          </div>

                          {/* Other Permissions */}
                          {otherPermissions.length > 0 && (
                            <div className="flex flex-wrap gap-space-md ml-section">
                              {otherPermissions.map(
                                (perm: { action: string; description: string }) => (
                                  <div
                                    key={`${app.slug}-${perm.action}`}
                                    className="flex items-center space-x-space-sm"
                                  >
                                    <Checkbox
                                      id={`perm-${app.slug}-${perm.action}`}
                                      checked={appPerms.includes(perm.action)}
                                      onCheckedChange={(checked) => {
                                        const existing = editAppPermissions[app.slug] ?? [];
                                        if (checked) {
                                          onAppPermissionsChange({
                                            ...editAppPermissions,
                                            [app.slug]: [...existing, perm.action],
                                          });
                                        } else {
                                          onAppPermissionsChange({
                                            ...editAppPermissions,
                                            [app.slug]: existing.filter((a) => a !== perm.action),
                                          });
                                        }
                                      }}
                                      disabled={!hasAccess || isSelf}
                                    />
                                    <label
                                      htmlFor={`perm-${app.slug}-${perm.action}`}
                                      className={`text-sm leading-none peer-disabled:cursor-not-allowed ${
                                        !hasAccess
                                          ? "text-muted-foreground"
                                          : "peer-disabled:opacity-70"
                                      }`}
                                    >
                                      {perm.description}
                                    </label>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {isSelf && (
                    <p className="text-sm text-muted-foreground mt-space-xs">
                      {t("cannotChangeOwnAppPermissions")}
                    </p>
                  )}
                </div>
              )}
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {tc("buttons.cancel")}
          </Button>
          <LoadingButton
            type="submit"
            form="edit-user-form"
            loading={isLoading}
            loadingText={tc("loading.saving")}
          >
            {tc("buttons.saveChanges")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
