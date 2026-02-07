"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PendingUserInviteResponse } from "@/types/users/user-invites.types";
import type { AdminUserResponse } from "@/types/users/users.types";
import { PaginationSize } from "@/lib/preferences";
import type { UserPermissionsWithContext } from "@/hooks/admin/use-resource-permissions";
import { PendingInviteCard } from "@/components/admin/users/pending-invite-card";
import { UserCard } from "@/components/admin/users/user-card";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";

export interface UserListViewProps {
  // Data
  users: AdminUserResponse[];
  usersData:
    | {
        users: AdminUserResponse[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
    | undefined;
  pendingInvites: PendingUserInviteResponse[];

  // Pagination
  page: number;
  limit: PaginationSize;

  // Permissions
  permissions: UserPermissionsWithContext;

  // Filter state
  hasActiveFilters: boolean;

  // Mutation states
  isToggleStatusPending: boolean;
  isDeletePending: boolean;
  isImpersonatePending: boolean;
  isUnlockPending: boolean;
  isResendInvitePending: boolean;
  isCancelInvitePending: boolean;

  // Handlers
  onPageChange: (page: number) => void;
  onEditUser: (user: AdminUserResponse) => void;
  onToggleUserStatus: (user: AdminUserResponse) => void;
  onDeleteUser: (user: AdminUserResponse) => void;
  onImpersonateUser: (user: AdminUserResponse) => void;
  onUnlockUser: (user: AdminUserResponse) => void;
  onResendInvite: (inviteId: string) => void;
  onCancelInvite: (inviteId: string) => void;

  // Business logic helpers
  shouldDisableAction: (user: AdminUserResponse) => boolean;
  getDisabledActionTooltip: (
    user: AdminUserResponse,
    action: "delete" | "deactivate" | "edit",
  ) => string;
}

/**
 * Presentation component for user list
 * Renders user cards, pagination, empty states, and pending invites
 */
export function UserListView({
  users,
  usersData,
  pendingInvites,
  page,
  limit,
  permissions,
  hasActiveFilters,
  isToggleStatusPending,
  isDeletePending,
  isImpersonatePending,
  isUnlockPending,
  isResendInvitePending,
  isCancelInvitePending,
  onPageChange,
  onEditUser,
  onToggleUserStatus,
  onDeleteUser,
  onImpersonateUser,
  onUnlockUser,
  onResendInvite,
  onCancelInvite,
  shouldDisableAction,
  getDisabledActionTooltip,
}: UserListViewProps) {
  const t = useTranslations("system.users");

  return (
    <>
      {/* User Cards */}
      {users.length > 0 ? (
        users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            currentUserId={permissions.currentUserId}
            canEdit={permissions.canEdit}
            canActivate={permissions.canActivate}
            canDelete={permissions.canDelete}
            canImpersonate={permissions.canImpersonate}
            isToggleStatusPending={isToggleStatusPending}
            isDeletePending={isDeletePending}
            isImpersonatePending={isImpersonatePending}
            isUnlockPending={isUnlockPending}
            shouldDisableAction={shouldDisableAction}
            getDisabledActionTooltip={getDisabledActionTooltip}
            onEdit={onEditUser}
            onToggleStatus={onToggleUserStatus}
            onDelete={onDeleteUser}
            onImpersonate={onImpersonateUser}
            onUnlock={onUnlockUser}
          />
        ))
      ) : (
        <EmptyState title={hasActiveFilters ? t("noUsersFiltered") : t("noUsers")} />
      )}

      {/* Pagination */}
      {usersData && (
        <DataPagination
          page={page}
          totalPages={usersData.totalPages}
          total={usersData.total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <div className="flex flex-col gap-space-md">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-space-sm">
            <Clock className="h-4 w-4" />
            {t("pendingInvitations")} ({pendingInvites.length})
          </h3>
          {pendingInvites.map((invite) => (
            <PendingInviteCard
              key={invite.id}
              invite={invite}
              canManage={permissions.canCreate}
              isResendPending={isResendInvitePending}
              isCancelPending={isCancelInvitePending}
              onResend={onResendInvite}
              onCancel={onCancelInvite}
            />
          ))}
        </div>
      )}
    </>
  );
}
