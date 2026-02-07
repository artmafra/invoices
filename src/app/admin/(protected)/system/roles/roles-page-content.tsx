"use client";

import { useRef } from "react";
import { ShieldPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useActionFromUrl } from "@/hooks/admin/use-action-from-url";
import { usePermissions } from "@/hooks/admin/use-permissions";
import { useRolePermissions } from "@/hooks/admin/use-resource-permissions";
import { useRoles } from "@/hooks/admin/use-roles";
import { useRolesActions } from "@/hooks/admin/use-roles-actions";
import { useRolesDialogs } from "@/hooks/admin/use-roles-dialogs";
import { useRolesFilters } from "@/hooks/admin/use-roles-filters";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import {
  LazyCreateRoleDialog,
  LazyEditRoleDialog,
} from "@/components/admin/roles/lazy-roles-dialogs";
import { RoleListView } from "@/components/admin/roles/role-list-view";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { SearchBar } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import { SidebarInset } from "@/components/ui/sidebar";

export function AdminRolesSettingsPageContent() {
  const t = useTranslations("system.roles");
  const tc = useTranslations("common");

  // Permissions
  const permissions = useRolePermissions();

  // Filters and sorting
  const {
    filters,
    searchInput,
    sortOptions,
    animationRef,
    setSearchInput,
    setSort,
    setPage,
    clearFilters,
    hasActiveFilters,
  } = useRolesFilters();

  // Pagination
  const limit = usePaginationSize();

  // Keyboard shortcut for search
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  // Dialog state management
  const dialogState = useRolesDialogs();
  const {
    dialogs,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteConfirm,
    closeDeleteConfirm,
  } = dialogState;

  // Data fetching
  const { data: rolesData, isLoading: isLoadingRoles } = useRoles({
    search: filters.search || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: filters.page,
    limit,
  });

  const roles = rolesData?.roles ?? [];
  const { data: permissionGroups, isLoading: isLoadingPermissions } = usePermissions();
  const isLoading = isLoadingRoles || isLoadingPermissions;

  // Actions (mutations and handlers)
  const actions = useRolesActions({
    permissions,
    dialogs,
    permissionGroups,
    closeCreateDialog,
    closeEditDialog,
    closeDeleteConfirm,
  });

  const {
    mutations,
    getPermissionIdsFromStrings,
    handleCreateRole,
    handleEditRole,
    handleConfirmDeleteRole,
    shouldDisableAction,
    getDisabledActionTooltip,
  } = actions;

  // Command palette integration
  useActionFromUrl("create", openCreateDialog);

  // Handler to open edit dialog with permission conversion
  const handleOpenEditDialog = (role: (typeof roles)[0]) => {
    openEditDialog(role);
  };

  // Handler to check for deletion eligibility
  const handleDeleteRole = (roleId: string) => {
    if (!permissions.canDelete) {
      toast.error(t("errors.noDeletePermission"));
      return;
    }

    const role = roles?.find((r) => r.id === roleId);

    if (role?.isProtected) {
      toast.error(t("errors.cannotDeleteProtected"));
      return;
    }

    if (roleId === permissions.currentUserRoleId) {
      toast.error(t("errors.cannotDeleteOwn"));
      return;
    }

    if (role?.userCount && role.userCount > 0) {
      toast.error(t("errors.hasUsers", { count: role.userCount }));
      return;
    }

    if (role) {
      openDeleteConfirm(role);
    }
  };

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader
          title={t("title")}
          actions={
            permissions.canCreate && (
              <Button onClick={openCreateDialog} size="sm" variant="outline">
                <ShieldPlus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("add")}</span>
              </Button>
            )
          }
        />
        <PageContainer>
          <PageDescription>{t("description")}</PageDescription>

          {/* Search and Filters */}
          <SearchBar
            ref={searchRef}
            searchPlaceholder={t("searchPlaceholder")}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
            showFilterToggle={false}
            sortOptions={sortOptions}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortChange={setSort}
          />

          {/* Loading Transition and List View */}
          <LoadingTransition
            ref={animationRef}
            isLoading={isLoading && roles.length === 0}
            loadingMessage={tc("loading.default")}
          >
            <RoleListView
              roles={roles}
              rolesData={rolesData}
              page={filters.page}
              limit={limit}
              permissions={permissions}
              hasActiveFilters={hasActiveFilters}
              isDeletePending={mutations.deleteRole.isPending}
              onPageChange={setPage}
              onEditRole={handleOpenEditDialog}
              onDeleteRole={handleDeleteRole}
              shouldDisableAction={shouldDisableAction}
              getDisabledActionTooltip={getDisabledActionTooltip}
            />
          </LoadingTransition>

          {/* Dialogs */}
          <LazyCreateRoleDialog
            open={dialogs.showCreateDialog}
            onOpenChange={(open) => !open && closeCreateDialog()}
            permissionGroups={permissionGroups}
            isLoading={mutations.createRole.isPending}
            onSubmit={handleCreateRole}
          />

          <LazyEditRoleDialog
            open={!!dialogs.editingRole}
            onOpenChange={(open) => !open && closeEditDialog()}
            role={dialogs.editingRole}
            initialPermissionIds={
              dialogs.editingRole
                ? getPermissionIdsFromStrings(dialogs.editingRole.permissions)
                : []
            }
            permissionGroups={permissionGroups}
            isLoading={mutations.updateRole.isPending}
            onSubmit={handleEditRole}
          />

          {/* Confirmation Dialogs */}
          <ConfirmDialog
            open={!!dialogs.roleToDelete}
            onOpenChange={(open) => !open && closeDeleteConfirm()}
            title={t("deleteTitle")}
            description={t("deleteDescription", { name: dialogs.roleToDelete?.displayName ?? "" })}
            confirmText={tc("buttons.delete")}
            onConfirm={handleConfirmDeleteRole}
            loading={mutations.deleteRole.isPending}
            variant="destructive"
          />
        </PageContainer>
      </SidebarInset>
    </ErrorBoundary>
  );
}
