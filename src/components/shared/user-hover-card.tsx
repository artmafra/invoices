"use client";

import { useState } from "react";
import { Calendar, LogIn, User } from "lucide-react";
import { useTranslations } from "next-intl";
import type { UserHoverCardResponse } from "@/types/users/users.types";
import { getAvatarUrl } from "@/lib/avatar";
import { useUserHoverCard } from "@/hooks/admin/use-users";
import { useDateFormat } from "@/hooks/use-date-format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";

export interface UserHoverCardProps {
  /** User ID to fetch details for */
  userId: string;
  /** Element to trigger the hover card (e.g., user name text) */
  children: React.ReactNode;
  /** Side of the trigger to render the content */
  side?: "top" | "right" | "bottom" | "left";
  /** Alignment of the content */
  align?: "start" | "center" | "end";
}

/**
 * Gets the initials for a user's avatar from their display name.
 * Returns up to 2 characters (first letter of first and last name).
 */
function getInitials(name: string | null, fallback: string): string {
  const displayName = name || fallback;
  return displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Loading skeleton for the hover card content
 */
function HoverCardSkeleton() {
  return (
    <div className="flex gap-space-md">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-space-sm">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
        <div className="pt-space-sm space-y-space-xs">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * Content displayed inside the hover card
 */
function HoverCardUserContent({ user }: { user: UserHoverCardResponse }) {
  const t = useTranslations("system.users");
  const { formatDate, formatDateTime } = useDateFormat();

  const displayName = user.name || t("noName");
  const initials = getInitials(user.name, t("noName"));

  return (
    <div className="flex gap-space-md">
      <Avatar className="h-12 w-12">
        <AvatarImage src={getAvatarUrl(user.image, "sm")} alt={displayName} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-space-xs">
        {/* Name and status */}
        <div className="flex items-center gap-space-sm">
          <span className="font-semibold truncate">{displayName}</span>
          {!user.isActive && (
            <Badge variant="destructive" className="text-[10px] px-space-xs py-0">
              {t("hoverCard.inactive")}
            </Badge>
          )}
        </div>

        {/* Email */}
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>

        {/* Details */}
        <div className="pt-space-sm space-y-space-xs text-xs text-muted-foreground">
          {/* Role */}
          <div className="flex items-center gap-space-sm">
            <User className="h-3 w-3" />
            <span>{t("hoverCard.role")}:</span>
            <span className="text-foreground">
              {user.roleName || <span className="italic">{t("noRole")}</span>}
            </span>
          </div>

          {/* Last login */}
          <div className="flex items-center gap-space-sm">
            <LogIn className="h-3 w-3" />
            <span>{t("hoverCard.lastLogin")}:</span>
            <span className="text-foreground">
              {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : t("hoverCard.never")}
            </span>
          </div>

          {/* Member since */}
          <div className="flex items-center gap-space-sm">
            <Calendar className="h-3 w-3" />
            <span>{t("hoverCard.memberSince")}:</span>
            <span className="text-foreground">{formatDate(user.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hoverable user info popup component.
 *
 * Displays user details (avatar, name, email, role, status, timestamps)
 * when hovering over user names throughout the admin panel.
 *
 * Features:
 * - Lazy loads user data on hover (not on mount)
 * - Caches data for 10 minutes to reduce API calls
 * - Shows loading skeleton while fetching
 * - Displays: profile picture, display name, email, role, status, last login, created date
 *
 * @example
 * ```tsx
 * <UserHoverCard userId={user.id}>
 *   <span className="cursor-pointer hover:underline">{user.name}</span>
 * </UserHoverCard>
 * ```
 */
export function UserHoverCard({
  userId,
  children,
  side = "top",
  align = "start",
}: UserHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: user, isLoading } = useUserHoverCard(userId, isOpen);

  return (
    <HoverCard openDelay={300} closeDelay={100} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side={side} align={align} className="w-80">
        {isLoading || !user ? <HoverCardSkeleton /> : <HoverCardUserContent user={user} />}
      </HoverCardContent>
    </HoverCard>
  );
}
