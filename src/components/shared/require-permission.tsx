"use client";

import { type ReactNode } from "react";
import { ShieldX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUserSession } from "@/hooks/use-session";
import { AdminHeader } from "@/components/admin/admin-header";
import { LoadingState } from "@/components/shared/loading-state";
import { PageContainer } from "@/components/shared/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset } from "@/components/ui/sidebar";

interface RequirePermissionProps {
  /** The resource to check view permission for (e.g., "users", "settings") */
  resource: string;
  /** The action to check (defaults to "view") */
  action?: string;
  /** The page content to render if authorized */
  children: ReactNode;
}

/**
 * Client-side permission guard component for UX optimization.
 *
 * ⚠️ **SECURITY NOTE**: This is a UX-only component that can be bypassed via browser DevTools.
 * It provides instant feedback to users but is NOT a security boundary.
 *
 * **For security-critical pages** (e.g., user management, role management, settings),
 * add server-side permission checks in the page component using `hasPermission()`
 * before rendering client components. See system pages for examples.
 *
 * **Pattern:**
 * - Server-side checks (page.tsx): Security boundary - prevents HTML from being sent
 * - Client-side checks (this component): UX optimization - instant feedback without API calls
 *
 * All API routes must still use `requirePermission()` server-side for actual enforcement.
 *
 * @example
 * ```tsx
 * // Client component (UX-only)
 * <RequirePermission resource="users">
 *   <UsersPageContent />
 * </RequirePermission>
 * ```
 *
 * @example
 * ```tsx
 * // Server component (security boundary) - Recommended for sensitive pages
 * export default async function Page() {
 *   const session = await auth();
 *   if (!hasPermission(session, "users", "view")) {
 *     redirect("/admin/unauthorized");
 *   }
 *   return <PageContent />;
 * }
 * ```
 */
export function RequirePermission({ resource, action = "view", children }: RequirePermissionProps) {
  const { loading, hasPermission } = useUserSession();
  const t = useTranslations("errors.permissions");

  const isAuthorized = hasPermission(resource, action);

  // Show loading state while session loads
  if (loading) {
    return (
      <SidebarInset>
        <div className="flex flex-1 items-center justify-center">
          <LoadingState message={t("checkingPermissions")} />
        </div>
      </SidebarInset>
    );
  }

  // Show 403 Forbidden error if not authorized
  if (!isAuthorized) {
    return (
      <SidebarInset>
        <AdminHeader title="" />
        <PageContainer>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-space-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <ShieldX className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle>{t("forbidden")}</CardTitle>
                  <CardDescription>{t("noPermissionToView")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("contactAdmin")}</p>
            </CardContent>
          </Card>
        </PageContainer>
      </SidebarInset>
    );
  }

  return <>{children}</>;
}
