"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import type { UserPermissionsWithContext } from "@/hooks/admin/use-resource-permissions";
import {
  SearchBar,
  SearchBarFilterSelect,
  SearchBarSortOption,
} from "@/components/shared/search-bar";

export interface UserListToolbarProps {
  // Search state
  searchValue: string;
  onSearchChange: (value: string) => void;

  // Sort state
  sortOptions: SearchBarSortOption[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;

  // Filter state
  roleFilter: string | undefined;
  statusFilter: string | undefined;
  onRoleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;

  // Roles data
  roles: Array<{ id: string; displayName: string }> | undefined;

  // Permissions
  permissions: UserPermissionsWithContext;

  // Filter actions
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

/**
 * Presentation component for user list toolbar
 * Renders search bar, filters, and action buttons
 */
export const UserListToolbar = forwardRef<HTMLInputElement, UserListToolbarProps>(
  function UserListToolbar(
    {
      searchValue,
      onSearchChange,
      sortOptions,
      sortBy,
      sortOrder,
      onSortChange,
      roleFilter,
      statusFilter,
      onRoleFilterChange,
      onStatusFilterChange,
      roles,
      permissions,
      hasActiveFilters,
      onClearFilters,
    },
    ref,
  ) {
    const t = useTranslations("system.users");
    const tc = useTranslations("common");

    return (
      <SearchBar
        ref={ref}
        searchPlaceholder={t("searchPlaceholder")}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        hasActiveFilters={hasActiveFilters}
        onClear={onClearFilters}
        sortOptions={sortOptions}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
      >
        {permissions.canViewRoles && (
          <SearchBarFilterSelect
            label={t("filters.role")}
            value={roleFilter}
            onValueChange={(v) => onRoleFilterChange(v === undefined ? "any" : v)}
            anyLabel={t("filters.any")}
            options={
              roles?.map((role) => ({
                value: role.id,
                label: role.displayName,
              })) || []
            }
          />
        )}
        <SearchBarFilterSelect
          label={t("filters.status")}
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v === undefined ? "any" : v)}
          anyLabel={t("filters.any")}
          options={[
            { value: "active", label: tc("status.active") },
            { value: "inactive", label: tc("status.inactive") },
          ]}
        />
      </SearchBar>
    );
  },
);
