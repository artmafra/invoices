"use client";

import { useEffect, useRef } from "react";
import { Mail, UserRoundPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useActionFromUrl } from "@/hooks/admin/use-action-from-url";
import { useUserPermissions } from "@/hooks/admin/use-resource-permissions";
import { useAssignableRoles } from "@/hooks/admin/use-roles";
import { usePendingUserInvites } from "@/hooks/admin/use-user-invite";
import { useUsers } from "@/hooks/admin/use-users";
import { useUsersActions } from "@/hooks/admin/use-users-actions";
import { useUsersDialogs } from "@/hooks/admin/use-users-dialogs";
import { useUsersFilters } from "@/hooks/admin/use-users-filters";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import {
  LazyCreateUserDialog,
  LazyEditUserDialog,
  LazyInviteUserDialog,
} from "@/components/admin/users/lazy-users-dialogs";
import { UserListToolbar } from "@/components/admin/users/user-list-toolbar";
import { UserListView } from "@/components/admin/users/user-list-view";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { Button } from "@/components/ui/button";
import { SidebarInset } from "@/components/ui/sidebar";

export function AdminUsersSettingsPageContent() {
  const t = useTranslations("system.users");
  const tc = useTranslations("common");

  // Permissions
  const permissions = useUserPermissions();

  // Filters and sorting
  const {
    filters,
    searchInput,
    sortOptions,
    animationRef,
    setSearchInput,
    setRoleFilter,
    setStatusFilter,
    setSort,
    setPage,
    clearFilters,
    hasActiveFilters,
  } = useUsersFilters();

  // Pagination
  const limit = usePaginationSize();

  // Keyboard shortcut for search
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  // Dialog state management
  const dialogState = useUsersDialogs();
  const {
    dialogs,
    setEditAppPermissions,
    openCreateDialog,
    closeCreateDialog,
    openInviteDialog,
    closeInviteDialog,
    openEditDialog,
    closeEditDialog,
    closeDeleteConfirm,
    closeToggleStatusConfirm,
    closeImpersonateConfirm,
    closeUnlockConfirm,
  } = dialogState;

  // Data fetching
  const { data: usersData, isLoading } = useUsers({
    search: filters.search || undefined,
    roleId: filters.roleId,
    status: filters.status as "active" | "inactive" | undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: filters.page,
    limit,
  });

  const users = usersData?.users ?? [];
  const { data: roles } = useAssignableRoles(permissions.canViewRoles);
  const { data: pendingInvites = [] } = usePendingUserInvites();

  // Actions (mutations and handlers)
  const actions = useUsersActions({
    permissions,
    dialogs,
    closeCreateDialog,
    closeInviteDialog,
    closeEditDialog,
    closeDeleteConfirm,
    closeToggleStatusConfirm,
    closeImpersonateConfirm,
    closeUnlockConfirm,
    _setEditAppPermissions: setEditAppPermissions,
  });

  const {
    mutations,
    editingUserAppPermissions,
    handleCreateUser,
    handleInviteUser,
    handleCancelInvite,
    handleResendInvite,
    handleConfirmToggleUserStatus,
    handleConfirmPermanentlyDeleteUser,
    handleConfirmStartImpersonation,
    handleConfirmUnlockUser,
    handleEditUser,
    shouldDisableAction,
    getDisabledActionTooltip,
  } = actions;

  // Sync app permissions state when editing user's permissions are fetched
  useEffect(() => {
    if (editingUserAppPermissions?.permissions) {
      setEditAppPermissions(editingUserAppPermissions.permissions);
    }
  }, [editingUserAppPermissions?.permissions, setEditAppPermissions]);

  // Command palette integration
  useActionFromUrl("create", openCreateDialog);
  useActionFromUrl("invite", openInviteDialog);

  // Toggle status handler with self-protection
  const handleToggleUserStatus = (user: (typeof users)[0]) => {
    if (!permissions.canActivate) {
      toast.error(t("errors.noActivatePermission"));
      return;
    }

    if (user.id === permissions.currentUserId) {
      toast.error(t("errors.cannotDeactivateSelf"));
      return;
    }

    dialogState.openToggleStatusConfirm(user);
  };

  // Delete handler with self-protection
  const handlePermanentlyDeleteUser = (user: (typeof users)[0]) => {
    if (!permissions.canDelete) {
      toast.error(t("errors.noDeletePermission"));
      return;
    }

    if (user.id === permissions.currentUserId) {
      toast.error(t("errors.cannotDeleteSelf"));
      return;
    }

    dialogState.openDeleteConfirm(user);
  };

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader
          title={t("title")}
          actions={
            permissions.canCreate ? (
              <>
                <Button onClick={openInviteDialog} size="sm" variant="outline">
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("invite")}</span>
                </Button>
                <Button onClick={openCreateDialog} size="sm" variant="outline">
                  <UserRoundPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("add")}</span>
                </Button>
              </>
            ) : undefined
          }
        />
        <PageContainer>
          <PageDescription>{t("description")}</PageDescription>

          {/* Toolbar: Search, Filters, Action Buttons */}
          <UserListToolbar
            ref={searchRef}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            sortOptions={sortOptions}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortChange={setSort}
            roleFilter={filters.roleId}
            statusFilter={filters.status}
            onRoleFilterChange={setRoleFilter}
            onStatusFilterChange={setStatusFilter}
            roles={roles}
            permissions={permissions}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />

          {/* Loading Transition and List View */}
          <LoadingTransition
            ref={animationRef}
            isLoading={isLoading && users.length === 0}
            loadingMessage={tc("loading.default")}
          >
            <UserListView
              users={users}
              usersData={usersData}
              pendingInvites={pendingInvites}
              page={filters.page}
              limit={limit}
              permissions={permissions}
              hasActiveFilters={hasActiveFilters}
              isToggleStatusPending={mutations.toggleUserStatus.isPending}
              isDeletePending={mutations.permanentlyDeleteUser.isPending}
              isImpersonatePending={mutations.startImpersonation.isPending}
              isUnlockPending={mutations.unlockUser.isPending}
              isResendInvitePending={mutations.resendInvite.isPending}
              isCancelInvitePending={mutations.cancelInvite.isPending}
              onPageChange={setPage}
              onEditUser={openEditDialog}
              onToggleUserStatus={handleToggleUserStatus}
              onDeleteUser={handlePermanentlyDeleteUser}
              onImpersonateUser={dialogState.openImpersonateConfirm}
              onUnlockUser={dialogState.openUnlockConfirm}
              onResendInvite={handleResendInvite}
              onCancelInvite={handleCancelInvite}
              shouldDisableAction={shouldDisableAction}
              getDisabledActionTooltip={getDisabledActionTooltip}
            />
          </LoadingTransition>

          {/* Dialogs */}
          {dialogs.editingUser && (
            <LazyEditUserDialog
              user={dialogs.editingUser}
              editAppPermissions={dialogs.editAppPermissions}
              isLoading={mutations.updateUser.isPending || mutations.updateAppPermissions.isPending}
              onClose={closeEditDialog}
              onSubmit={handleEditUser}
              onAppPermissionsChange={setEditAppPermissions}
            />
          )}

          {dialogs.showCreateDialog && (
            <LazyCreateUserDialog
              open={dialogs.showCreateDialog}
              isLoading={mutations.createUser.isPending}
              onOpenChange={(open) => !open && closeCreateDialog()}
              onSubmit={handleCreateUser}
            />
          )}

          {dialogs.showInviteDialog && (
            <LazyInviteUserDialog
              open={dialogs.showInviteDialog}
              isLoading={mutations.createInvite.isPending}
              onOpenChange={(open) => !open && closeInviteDialog()}
              onSubmit={handleInviteUser}
            />
          )}

          {/* Confirmation Dialogs */}
          <ConfirmDialog
            open={!!dialogs.userToDelete}
            onOpenChange={(open) => !open && closeDeleteConfirm()}
            title={t("deleteTitle")}
            description={t("deleteDescription", {
              name: dialogs.userToDelete?.name || dialogs.userToDelete?.email || "",
            })}
            confirmText={tc("buttons.delete")}
            onConfirm={handleConfirmPermanentlyDeleteUser}
            loading={mutations.permanentlyDeleteUser.isPending}
            variant="destructive"
          />

          <ConfirmDialog
            open={!!dialogs.userToToggleStatus}
            onOpenChange={(open) => !open && closeToggleStatusConfirm()}
            title={dialogs.userToToggleStatus?.isActive ? t("deactivateTitle") : t("activateTitle")}
            description={
              dialogs.userToToggleStatus?.isActive
                ? t("deactivateDescription", {
                    name:
                      dialogs.userToToggleStatus?.name || dialogs.userToToggleStatus?.email || "",
                  })
                : t("activateDescription", {
                    name:
                      dialogs.userToToggleStatus?.name || dialogs.userToToggleStatus?.email || "",
                  })
            }
            confirmText={
              dialogs.userToToggleStatus?.isActive ? t("deactivateUser") : t("activateUser")
            }
            onConfirm={handleConfirmToggleUserStatus}
            loading={mutations.toggleUserStatus.isPending}
            variant="warning"
          />

          <ConfirmDialog
            open={!!dialogs.userToImpersonate}
            onOpenChange={(open) => !open && closeImpersonateConfirm()}
            title={t("impersonateTitle")}
            description={t("impersonateDescription", {
              name: dialogs.userToImpersonate?.name || dialogs.userToImpersonate?.email || "",
            })}
            confirmText={t("startImpersonation")}
            onConfirm={handleConfirmStartImpersonation}
            loading={mutations.startImpersonation.isPending}
            variant="warning"
          />

          <ConfirmDialog
            open={!!dialogs.userToUnlock}
            onOpenChange={(open) => !open && closeUnlockConfirm()}
            title={t("unlockTitle")}
            description={t("unlockDescription", {
              name: dialogs.userToUnlock?.name || dialogs.userToUnlock?.email || "",
            })}
            confirmText={t("unlockAccount")}
            onConfirm={handleConfirmUnlockUser}
            loading={mutations.unlockUser.isPending}
            variant="warning"
          />
        </PageContainer>
      </SidebarInset>
    </ErrorBoundary>
  );
}
