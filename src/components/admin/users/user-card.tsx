"use client";

import { Eye, Lock, LockOpen, MoreVertical, Trash2, UserCheck, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AdminUserResponse } from "@/types/users/users.types";
import { getAvatarUrl } from "@/lib/avatar";
import { useDateFormat } from "@/hooks/use-date-format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDisplayName, getInitials } from "./user-utils";

export interface UserCardProps {
  user: AdminUserResponse;
  currentUserId: string | undefined;
  canEdit: boolean;
  canActivate: boolean;
  canDelete: boolean;
  canImpersonate: boolean;
  isToggleStatusPending: boolean;
  isDeletePending: boolean;
  isImpersonatePending: boolean;
  isUnlockPending: boolean;
  shouldDisableAction: (user: AdminUserResponse) => boolean;
  getDisabledActionTooltip: (
    user: AdminUserResponse,
    action: "delete" | "deactivate" | "edit",
  ) => string;
  onEdit: (user: AdminUserResponse) => void;
  onToggleStatus: (user: AdminUserResponse) => void;
  onDelete: (user: AdminUserResponse) => void;
  onImpersonate: (user: AdminUserResponse) => void;
  onUnlock: (user: AdminUserResponse) => void;
}

export function UserCard({
  user,
  currentUserId,
  canEdit,
  canActivate,
  canDelete,
  canImpersonate,
  isToggleStatusPending,
  isDeletePending,
  isImpersonatePending,
  isUnlockPending,
  shouldDisableAction,
  getDisabledActionTooltip,
  onEdit,
  onToggleStatus,
  onDelete,
  onImpersonate,
  onUnlock,
}: UserCardProps) {
  const t = useTranslations("system.users");
  const tc = useTranslations("common");
  const { formatDateTime } = useDateFormat();

  const isCurrentUser = user.id === currentUserId;

  const displayName = getDisplayName(user, t("noName"));
  const initials = getInitials(user, t("noName"));

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-space-lg">
          {/* Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarImage src={getAvatarUrl(user.image, "sm")} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-space-sm">
              <CardTitle>{displayName}</CardTitle>
              <Badge className="shrink-0" variant="outline">
                {user.roleName || <span className="italic">{t("noRole")}</span>}
              </Badge>
            </div>
            <CardDescription>{user.email}</CardDescription>
          </div>

          {/* Badges */}
          <div className="hidden sm:flex items-center gap-space-sm">
            {!user.isActive && <Badge variant="destructive">{tc("status.inactive")}</Badge>}
            {user.isLocked && (
              <Badge variant="warning">
                <Lock className="mr-space-xs h-3 w-3" />
                {tc("status.locked")}
              </Badge>
            )}
          </div>

          {/* Actions */}
          {(canImpersonate || canActivate || canDelete) && !user.isSystemRole && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={user.isSystemRole}
                  aria-label={tc("buttons.openMenu")}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canImpersonate && !isCurrentUser && !user.isSystemRole && user.isActive && (
                  <DropdownMenuItem
                    onClick={() => onImpersonate(user)}
                    disabled={isImpersonatePending}
                  >
                    <Eye className="h-4 w-4" />
                    {t("impersonate")}
                  </DropdownMenuItem>
                )}
                {canActivate && user.isLocked && (
                  <DropdownMenuItem onClick={() => onUnlock(user)} disabled={isUnlockPending}>
                    <LockOpen className="h-4 w-4" />
                    {t("unlockAccount")}
                  </DropdownMenuItem>
                )}
                {canActivate && (
                  <DropdownMenuItem
                    onClick={() => onToggleStatus(user)}
                    disabled={isToggleStatusPending || shouldDisableAction(user)}
                    className={shouldDisableAction(user) ? "opacity-50" : ""}
                    title={
                      shouldDisableAction(user) ? getDisabledActionTooltip(user, "deactivate") : ""
                    }
                  >
                    {user.isActive ? (
                      <>
                        <UserX className="h-4 w-4" />
                        {t("deactivateUser")}
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4" />
                        {t("activateUser")}
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(user)}
                    disabled={isDeletePending || shouldDisableAction(user)}
                    className={`text-destructive focus:text-destructive ${
                      shouldDisableAction(user) ? "opacity-50" : ""
                    }`}
                    title={
                      shouldDisableAction(user) ? getDisabledActionTooltip(user, "delete") : ""
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    {tc("buttons.delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile badges - shown below on small screens */}
        {(!user.isActive || user.isLocked) && (
          <div className="flex sm:hidden items-center gap-space-sm mt-space-md">
            {!user.isActive && <Badge variant="destructive">{tc("status.inactive")}</Badge>}
            {user.isLocked && (
              <Badge variant="warning">
                <Lock className="mr-space-xs h-3 w-3" />
                {tc("status.locked")}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      {/* Card Footer with Last Login and Edit Button */}
      <CardFooter className="flex items-center justify-between border-t pt-space-md">
        <span className="text-sm text-muted-foreground">
          {t("columns.lastLogin")}:{" "}
          {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : tc("time.never")}
        </span>
        {canEdit && (
          <Button onClick={() => onEdit(user)} disabled={shouldDisableAction(user)}>
            {tc("buttons.edit")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
