"use client";

import { MoreVertical, Shield, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PaginatedRolesResponse, RoleResponse } from "@/types/common/roles.types";
import { PaginationSize } from "@/lib/preferences";
import type { RolePermissionsWithContext } from "@/hooks/admin/use-resource-permissions";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RoleListViewProps {
  // Data
  roles: RoleResponse[];
  rolesData: PaginatedRolesResponse | undefined;

  // Pagination
  page: number;
  limit: PaginationSize;
  onPageChange: (page: number) => void;

  // Permissions
  permissions: RolePermissionsWithContext;

  // Filter state
  hasActiveFilters: boolean;

  // Mutation states
  isDeletePending: boolean;

  // Actions
  onEditRole: (role: RoleResponse) => void;
  onDeleteRole: (roleId: string) => void;

  // UI helpers
  shouldDisableAction: (role: RoleResponse, action: "delete" | "edit") => boolean;
  getDisabledActionTooltip: (role: RoleResponse, action: "delete" | "edit") => string;
}

/**
 * Presentation component for roles list view
 * Renders role cards, pagination, and empty states
 */
export function RoleListView({
  roles,
  rolesData,
  page,
  limit,
  onPageChange,
  permissions,
  hasActiveFilters,
  isDeletePending,
  onEditRole,
  onDeleteRole,
  shouldDisableAction,
  getDisabledActionTooltip,
}: RoleListViewProps) {
  const t = useTranslations("system.roles");
  const tc = useTranslations("common");

  return (
    <>
      {/* Role Cards */}
      {roles.length > 0 ? (
        roles.map((role) => (
          <Card key={role.id}>
            <CardContent>
              <div className="flex items-center gap-space-lg">
                {/* Icon */}
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    <Shield className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>

                {/* Role Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-space-sm">
                    <CardTitle>{role.displayName}</CardTitle>
                    {role.isProtected && (
                      <Badge variant="outline" className="shrink-0">
                        {t("protected")}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{role.description || t("noDescription")}</CardDescription>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-space-sm">
                  <Badge variant="secondary">
                    {t("permissions", { count: role.permissions.length })}
                  </Badge>
                </div>

                {/* Actions - Delete only */}
                {permissions.canDelete && !role.isProtected && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={tc("buttons.openMenu")}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onDeleteRole(role.id)}
                        disabled={isDeletePending || shouldDisableAction(role, "delete")}
                        className={`text-destructive focus:text-destructive ${
                          shouldDisableAction(role, "delete") ? "opacity-50" : ""
                        }`}
                        title={getDisabledActionTooltip(role, "delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                        {tc("buttons.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Mobile stats */}
              <div className="flex sm:hidden items-center gap-space-md mt-space-md">
                <Badge variant="secondary">
                  {t("permissions", { count: role.permissions.length })}
                </Badge>
              </div>
            </CardContent>

            {/* Card Footer with User Count and Edit Button */}
            <CardFooter className="flex items-center justify-between border-t pt-space-md">
              <div className="flex items-center gap-space-xs text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{t("users", { count: role.userCount })}</span>
              </div>
              {permissions.canEdit && (
                <Button onClick={() => onEditRole(role)}>{tc("buttons.edit")}</Button>
              )}
            </CardFooter>
          </Card>
        ))
      ) : (
        <EmptyState
          title={hasActiveFilters ? t("noRolesFiltered") : t("noRoles", { role: "admin" })}
        />
      )}

      {/* Pagination */}
      {rolesData && (
        <DataPagination
          page={page}
          totalPages={rolesData.totalPages}
          total={rolesData.total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
