"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { InvoiceStatus } from "@/schema/invoices.schema";
import { useTranslations } from "next-intl";
import { useActionFromUrl } from "@/hooks/admin/use-action-from-url";
import {
  useCreateInvoice,
  useDeleteInvoice,
  useInvoices,
  useUpdateInvoice,
} from "@/hooks/admin/use-invoices";
import { useInvoicesActions } from "@/hooks/admin/use-invoices-actions";
import { useInvoicesDialogs } from "@/hooks/admin/use-invoices-dialogs";
import { useInvoicesFilters } from "@/hooks/admin/use-invoices-filters";
import { useInvoicePermissions } from "@/hooks/admin/use-resource-permissions";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { InvoiceFormValues } from "@/components/admin/invoices/invoice-form-dialog";
import { InvoicesFilters } from "@/components/admin/invoices/invoices-filters";
import { InvoicesListView } from "@/components/admin/invoices/invoices-list-view";
import {
  LazyInvoiceDeleteDialog,
  LazyInvoiceFormDialog,
} from "@/components/admin/invoices/lazy-invoices-dialogs";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { SearchBar } from "@/components/shared/search-bar";
import { SidebarInset } from "@/components/ui/sidebar";

export function ReportsPageContent() {
  const t = useTranslations("apps/invoices");
  const permissions = useInvoicePermissions();
  const router = useRouter();

  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  // Filters with URL persistence
  const {
    filters,
    searchInput,
    animationRef,
    setSearchInput,
    setPage,
    clearFilters,
    setStatusFilter,
    setSupplierCnpjFilter,
    setServiceCodeFilter,
    setIssueDateRange,
    setDueDateRange,
    hasActiveFilters,
  } = useInvoicesFilters();

  const limit = usePaginationSize();

  // Tax filters (client-side)
  const [taxFilters, setTaxFilters] = useState<string[]>([]);

  // Dialog state
  const {
    dialogs,
    openCreateDialog,
    openEditDialog,
    closeFormDialog,
    openDeleteConfirm,
    closeDeleteConfirm,
  } = useInvoicesDialogs();

  const { data, isLoading } = useInvoices(
    {
      search: filters.search || undefined,
      status: filters.status !== "all" ? (filters.status as InvoiceStatus) : undefined,
      includePaid: filters.includePaid || filters.status === "paid",
      supplierCnpj: filters.supplierCnpj,
      serviceCode: filters.serviceCode,
      issueDateFrom: filters.issueDateFrom,
      issueDateTo: filters.issueDateTo,
      dueDateFrom: filters.dueDateFrom,
      dueDateTo: filters.dueDateTo,
    },
    filters.page,
    limit,
  );

  // Mutations
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  // Action handlers
  const actions = useInvoicesActions({
    permissions,
    createMutation: createInvoice,
    updateMutation: updateInvoice,
    deleteMutation: deleteInvoice,
    onCreateSuccess: closeFormDialog,
    onUpdateSuccess: closeFormDialog,
    onDeleteSuccess: closeDeleteConfirm,
  });

  const handleSubmit = useCallback(
    async (data: InvoiceFormValues) => {
      const invoiceData = {
        companyId: data.companyId,
        supplierCnpj: data.supplierCnpj.trim(),
        serviceCode: data.serviceCode.trim(),
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        entryDate: data.entryDate,
        valueCents: data.valueCents,
        invoiceNumber: data.invoiceNumber,
        status: data.status,
        materialDeductionCents: data.materialDeductionCents,
        inssPercent: data.inssPercent,
        csPercent: data.csPercent,
        issqnPercent: data.issqnPercent,
        irrfPercent: data.irrfPercent,
      };

      if (dialogs.editingInvoiceId) {
        await actions.handleUpdate({ invoiceId: dialogs.editingInvoiceId, data: invoiceData });
      } else {
        await actions.handleCreate(invoiceData);
      }
    },
    [dialogs.editingInvoiceId, actions],
  );

  const handleOpenEdit = useCallback(
    (invoiceId: string) => {
      const invoice = data?.data.find((i) => i.id === invoiceId);
      if (invoice) {
        openEditDialog(
          invoiceId,
          {
            supplierCnpj: invoice.supplierCnpj,
            serviceCode: invoice.serviceCode,
            issueDate: new Date(invoice.issueDate),
            dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
            valueCents: invoice.valueCents,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            materialDeductionCents: invoice.materialDeductionCents,
            inssPercent: invoice.inssPercent ?? invoice.service?.taxRates?.inss ?? undefined,
            csPercent: invoice.csPercent ?? invoice.service?.taxRates?.cs ?? undefined,
            issqnPercent: invoice.issqnPercent ?? invoice.service?.taxRates?.issqn ?? undefined,
            irrfPercent: invoice.irrfPercent ?? invoice.service?.taxRates?.irrf ?? undefined,
          },
          invoice.supplier?.taxRegime,
        );
      }
    },
    [data?.data, openEditDialog],
  );

  const handleDelete = useCallback(async () => {
    if (!dialogs.deleteInvoiceId) return;
    await actions.handleDelete(dialogs.deleteInvoiceId);
  }, [dialogs.deleteInvoiceId, actions]);

  useActionFromUrl("create", openCreateDialog);

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader title={t("nav.reports")} />
        <PageContainer>
          <PageDescription>{t("reportsDescription")}</PageDescription>
          <div className="space-y-section">
            {/* Search & Filters */}
            <SearchBar
              ref={searchRef}
              searchPlaceholder={t("searchPlaceholder")}
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              hasActiveFilters={hasActiveFilters}
            >
              <InvoicesFilters
                onIssueDateRange={({ from, to }) =>
                  setIssueDateRange(
                    from ? from.toISOString() : undefined,
                    to ? to.toISOString() : undefined,
                  )
                }
                onSupplierCnpj={setSupplierCnpjFilter}
                taxFilters={taxFilters}
                onTaxFilter={setTaxFilters}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
                t={t}
              />
            </SearchBar>

            <LoadingTransition
              ref={animationRef}
              isLoading={isLoading && !data}
              loadingMessage={t("loading")}
            >
              <InvoicesListView
                invoices={data?.data || []}
                invoicesData={data}
                page={filters.page}
                limit={limit}
                permissions={permissions}
                hasActiveFilters={hasActiveFilters || taxFilters.length > 0}
                taxFilters={taxFilters}
                onPageChange={setPage}
                onStatusChange={actions.handleStatusChange}
                onCreate={() => router.push("/admin/invoices")}
                onEdit={handleOpenEdit}
                onDelete={openDeleteConfirm}
              />
            </LoadingTransition>
          </div>
        </PageContainer>

        {/* Create/Edit Invoice Dialog */}
        <LazyInvoiceFormDialog
          open={dialogs.showFormDialog}
          onOpenChange={(open) => !open && closeFormDialog()}
          initialData={dialogs.initialData}
          initialSupplierTaxRegime={dialogs.initialSupplierTaxRegime}
          onSubmit={handleSubmit}
          isEditing={!!dialogs.editingInvoiceId}
          isSaving={actions.isCreating || actions.isUpdating}
        />

        {/* Delete Confirmation Dialog */}
        <LazyInvoiceDeleteDialog
          open={!!dialogs.deleteInvoiceId}
          onOpenChange={(open) => !open && closeDeleteConfirm()}
          onConfirm={handleDelete}
          isPending={actions.isDeleting}
        />
      </SidebarInset>
    </ErrorBoundary>
  );
}
