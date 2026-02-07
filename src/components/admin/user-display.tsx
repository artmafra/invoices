"use client";

import { useSessionContext } from "@/contexts/session-context";
import { useTranslations } from "next-intl";
import { getAvatarUrl } from "@/lib/avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserDisplayProps {
  /** Show impersonation indicator */
  showImpersonationBadge?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Generates initials from a user's name for avatar fallback.
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Shared user display component showing avatar, name, and email.
 * Used by NavUser (dropdown trigger) and ProfileHeader (static display).
 */
export function UserDisplay({ showImpersonationBadge = false, className }: UserDisplayProps) {
  const t = useTranslations("admin.nav");
  const { session } = useSessionContext();

  const isImpersonating = !!session?.user?.impersonatedBy;

  const user = {
    name: session?.user?.name || "Guest",
    email: session?.user?.email || "",
    avatar: session?.user?.image || undefined,
  };

  return (
    <div className={className}>
      <div className="relative">
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarImage src={getAvatarUrl(user.avatar, "sm")} alt={user.name} />
          <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
        </Avatar>
      </div>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">
          {user.name}
          {showImpersonationBadge && isImpersonating && (
            <span className="ml-space-xs text-warning">{t("viewingAs")}</span>
          )}
        </span>
        <span className="text-muted-foreground truncate text-xs">{user.email}</span>
      </div>
    </div>
  );
}

export { getInitials };
