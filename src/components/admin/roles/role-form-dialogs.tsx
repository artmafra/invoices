"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { PermissionGroup } from "@/types/permissions/permission-api.types";
import {
  createRoleSchema,
  updateRoleSchema,
  type CreateRoleRequest,
  type UpdateRoleRequest,
} from "@/validations/role.validations";
import { formatResourceName } from "@/hooks/admin/use-permissions";
import { LoadingButton } from "@/components/shared/loading-button";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface PermissionCheckboxesProps {
  value: string[];
  onChange: (value: string[]) => void;
  permissionGroups: PermissionGroup[] | undefined;
  disabled?: boolean;
}

/**
 * Shared component for rendering permission checkboxes grouped by resource
 */
export function PermissionCheckboxes({
  value = [],
  onChange,
  permissionGroups,
  disabled = false,
}: PermissionCheckboxesProps) {
  const handleTogglePermission = (permissionId: string) => {
    if (value.includes(permissionId)) {
      onChange(value.filter((id) => id !== permissionId));
    } else {
      onChange([...value, permissionId]);
    }
  };

  const handleToggleResource = (resource: string) => {
    const group = permissionGroups?.find((g) => g.resource === resource);
    if (!group) return;

    const resourcePermIds = group.permissions.map((p) => p.id);
    const allSelected = resourcePermIds.every((id) => value.includes(id));

    if (allSelected) {
      // Deselect all
      onChange(value.filter((id) => !resourcePermIds.includes(id)));
    } else {
      // Select all
      const newIds = [...new Set([...value, ...resourcePermIds])];
      onChange(newIds);
    }
  };

  return (
    <>
      {permissionGroups?.map((group) => {
        const resourcePermIds = group.permissions.map((p) => p.id);
        const allSelected = resourcePermIds.every((id) => value.includes(id));
        const someSelected = resourcePermIds.some((id) => value.includes(id));
        const isIndeterminate = someSelected && !allSelected;

        return (
          <div key={group.resource} className="space-y-space-md">
            <div className="flex items-center space-x-space-sm">
              <Checkbox
                id={`resource-${group.resource}`}
                checked={isIndeterminate ? "indeterminate" : allSelected}
                onCheckedChange={() => handleToggleResource(group.resource)}
                disabled={disabled}
              />
              <Label
                htmlFor={`resource-${group.resource}`}
                className="text-sm font-medium cursor-pointer"
              >
                {formatResourceName(group.resource)}
              </Label>
            </div>
            <div className="ml-section grid grid-cols-2 gap-space-sm">
              {group.permissions.map((permission) => (
                <div key={permission.id} className="flex items-center space-x-space-sm">
                  <Checkbox
                    id={`perm-${permission.id}`}
                    checked={value.includes(permission.id)}
                    onCheckedChange={() => handleTogglePermission(permission.id)}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`perm-${permission.id}`}
                    className="text-xs cursor-pointer text-muted-foreground"
                  >
                    {permission.action}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

export interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissionGroups: PermissionGroup[] | undefined;
  isLoading: boolean;
  onSubmit: (data: CreateRoleRequest) => void;
}

/**
 * Dialog component for creating a new role
 */
export function CreateRoleDialog({
  open,
  onOpenChange,
  permissionGroups,
  isLoading,
  onSubmit,
}: CreateRoleDialogProps) {
  const t = useTranslations("system.roles");
  const tc = useTranslations("common");

  const form = useForm<CreateRoleRequest>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      displayName: "",
      description: "",
      permissionIds: [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        displayName: "",
        description: "",
        permissionIds: [],
      });
    }
  }, [open, form]);

  const handleSubmit = (data: CreateRoleRequest) => {
    onSubmit(data);
  };

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
              id="create-role-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-space-lg"
              noValidate
            >
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("form.namePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.descriptionPlaceholder")}
                        rows={2}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permissionIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.permissions")}</FormLabel>
                    <div className="border rounded-md p-card space-y-space-lg">
                      <PermissionCheckboxes
                        value={field.value || []}
                        onChange={field.onChange}
                        permissionGroups={permissionGroups}
                        disabled={false}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("buttons.cancel")}
          </Button>
          <LoadingButton
            type="submit"
            form="create-role-form"
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

export interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: {
    displayName: string;
    description?: string | null;
    isProtected: boolean;
  } | null;
  initialPermissionIds: string[];
  permissionGroups: PermissionGroup[] | undefined;
  isLoading: boolean;
  onSubmit: (data: UpdateRoleRequest) => void;
}

/**
 * Dialog component for editing an existing role
 */
export function EditRoleDialog({
  open,
  onOpenChange,
  role,
  initialPermissionIds,
  permissionGroups,
  isLoading,
  onSubmit,
}: EditRoleDialogProps) {
  const t = useTranslations("system.roles");
  const tc = useTranslations("common");

  const form = useForm<UpdateRoleRequest>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      displayName: "",
      description: "",
      permissionIds: [],
    },
  });

  useEffect(() => {
    if (open && role) {
      form.reset({
        displayName: role.displayName,
        description: role.description || "",
        permissionIds: initialPermissionIds,
      });
    }
  }, [open, role, initialPermissionIds, form]);

  const handleSubmit = (data: UpdateRoleRequest) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editRole")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{t("editDescription")}</DialogDescription>
          <Form {...form}>
            <form
              id="edit-role-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-space-lg"
              noValidate
            >
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={role?.isProtected} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        {...field}
                        value={field.value || ""}
                        disabled={role?.isProtected}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permissionIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.permissions")}</FormLabel>
                    <div className="border rounded-md p-card space-y-space-lg">
                      <PermissionCheckboxes
                        value={field.value || []}
                        onChange={field.onChange}
                        permissionGroups={permissionGroups}
                        disabled={role?.isProtected}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("buttons.cancel")}
          </Button>
          <LoadingButton
            type="submit"
            form="edit-role-form"
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
