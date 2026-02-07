import { AlertCircle, RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { SidebarInset } from "@/components/ui/sidebar";
import { PageContainer } from "./page-container";

interface AdminErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Error fallback component for admin pages.
 * Renders within proper admin page structure (SidebarInset, AdminHeader, PageContainer)
 * so the sidebar and header remain visible when an error occurs.
 */
export function AdminErrorFallback({ error, resetErrorBoundary }: AdminErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const t = useTranslations("common");

  return (
    <SidebarInset>
      <AdminHeader title={t("errorBoundary.title")} />
      <PageContainer>
        <div className="flex flex-col gap-space-lg rounded-md border bg-destructive/10 border-destructive/20 p-card">
          <div className="flex items-start gap-space-md">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0             " />
            <div className="flex-1 space-y-space-sm">
              <div className="text-sm font-medium text-destructive">{t("errorBoundary.title")}</div>
              <div className="text-sm text-muted-foreground">{error.message}</div>

              {isDevelopment && error.stack && (
                <details className="mt-space-lg">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    {t("errorBoundary.viewStackTrace")}
                  </summary>
                  <pre className="mt-space-sm overflow-auto rounded bg-muted p-space-sm text-xs text-muted-foreground">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>

          <div>
            <Button
              onClick={resetErrorBoundary}
              variant="outline"
              size="sm"
              className="gap-space-sm"
            >
              <RefreshCcw className="h-4 w-4" />
              {t("buttons.tryAgain")}
            </Button>
          </div>
        </div>
      </PageContainer>
    </SidebarInset>
  );
}
