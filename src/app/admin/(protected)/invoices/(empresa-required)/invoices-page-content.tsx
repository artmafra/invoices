"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useCreateInvoice } from "@/hooks/admin/use-invoices";
import { AdminHeader } from "@/components/admin/admin-header";
import { InvoiceEntryCard } from "@/components/admin/invoices/invoice-entry-card";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { SidebarInset } from "@/components/ui/sidebar";

export function InvoicesPageContent() {
  const t = useTranslations("apps/invoices");
  const createInvoice = useCreateInvoice();

  const handleSubmit = useCallback(
    async (data: Parameters<typeof createInvoice.mutateAsync>[0]) => {
      await createInvoice.mutateAsync(data);
    },
    [createInvoice],
  );

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader title={t("title")} />
        <PageContainer>
          <PageDescription>{t("description")}</PageDescription>
          <InvoiceEntryCard onSubmit={handleSubmit} isSaving={createInvoice.isPending} />
        </PageContainer>
      </SidebarInset>
    </ErrorBoundary>
  );
}
