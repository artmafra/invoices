"use client";

import { Mail, MoreVertical, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PendingUserInviteResponse } from "@/types/users/user-invites.types";
import { useDateFormat } from "@/hooks/use-date-format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface PendingInviteCardProps {
  invite: PendingUserInviteResponse;
  canManage: boolean;
  isResendPending: boolean;
  isCancelPending: boolean;
  onResend: (inviteId: string) => void;
  onCancel: (inviteId: string) => void;
}

export function PendingInviteCard({
  invite,
  canManage,
  isResendPending,
  isCancelPending,
  onResend,
  onCancel,
}: PendingInviteCardProps) {
  const t = useTranslations("system.users");
  const tc = useTranslations("common");
  const { formatTimeUntil } = useDateFormat();

  return (
    <Card className="border-dashed">
      <CardContent>
        <div className="flex items-center gap-space-lg">
          {/* Avatar placeholder */}
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          {/* Invite Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-space-sm">
              <CardTitle>{invite.email}</CardTitle>
              <Badge variant="outline" className="shrink-0">
                {tc("status.pending")}
              </Badge>
            </div>
            <CardDescription>
              {t("invitedBy", { name: invite.inviterName || invite.inviterEmail })} •{" "}
              {formatTimeUntil(invite.expiresAt)}
            </CardDescription>
          </div>

          {/* Badges */}
          <div className="hidden sm:flex items-center gap-space-sm">
            <Badge variant="secondary">
              {invite.roleName || <span className="italic">{t("noRole")}</span>}
            </Badge>
          </div>

          {/* Actions */}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onResend(invite.id)} disabled={isResendPending}>
                  <RefreshCw className="h-4 w-4" />
                  {t("resendInvitation")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onCancel(invite.id)}
                  disabled={isCancelPending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("cancelInvitation")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile badges */}
        <div className="flex sm:hidden items-center gap-space-sm mt-space-md">
          <Badge variant="secondary">
            {invite.roleName || <span className="italic">{t("noRole")}</span>}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
