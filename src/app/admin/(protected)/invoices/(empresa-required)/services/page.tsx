"use client";

import { useCallback, useRef, useState } from "react";
import { useSelectedCompany } from "@/contexts/company-context";
import { Download, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionFromUrl } from "@/hooks/admin/use-action-from-url";
import { useServicePermissions } from "@/hooks/admin/use-resource-permissions";
import {
  useCreateService,
  useDeleteService,
  useServices,
  useUpdateService,
  type Service,
} from "@/hooks/admin/use-services";
import { useServicesFilters } from "@/hooks/admin/use-services-filters";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { ServiceCard } from "@/components/admin/services/service-card";
import { ServiceFormDialog } from "@/components/admin/services/service-form-dialog";
import { ServiceImportDialog } from "@/components/admin/services/service-import-form";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { RequirePermission } from "@/components/shared/require-permission";
import { SearchBar } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarInset } from "@/components/ui/sidebar";

export default function ServicesPage() {
  return (
    <RequirePermission resource="invoices">
      <ErrorBoundary fallback={AdminErrorFallback}>
        <ServicesPageContent />
      </ErrorBoundary>
    </RequirePermission>
  );
}

function ServicesPageContent() {
  const { canCreate, canEdit, canDelete } = useServicePermissions();
  const { selectedCompanyId } = useSelectedCompany();

  const t = useTranslations("apps/services");
  const tc = useTranslations("common");

  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  const limit = usePaginationSize();

  const {
    filters,
    searchInput,
    animationRef,
    setSearchInput,
    setPage,
    clearFilters,
    hasActiveFilters,
  } = useServicesFilters();

  const { data, isLoading } = useServices(
    { search: filters.search || undefined, companyId: selectedCompanyId ?? undefined },
    filters.page,
    limit,
  );

  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [showExportServiceForm, setShowExportServiceForm] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);

  const handleOpenExportForm = useCallback(() => {
    setShowExportServiceForm(true);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingService(null);
    setShowFormDialog(true);
  }, []);

  const handleOpenEdit = useCallback(
    (serviceId: string) => {
      const service = data?.data.find((s) => s.id === serviceId);
      if (service) {
        setEditingService(service);
        setShowFormDialog(true);
      }
    },
    [data?.data],
  );

  const handleCloseForm = useCallback(() => {
    setShowFormDialog(false);
    setEditingService(null);
  }, []);

  const handleSubmit = useCallback(
    (data: {
      companyId: string;
      code: string;
      description: string;
      sn: { issqn: number | null; inss: number | null; cs: number | null; irrf: number | null };
      n: { issqn: number | null; inss: number | null; cs: number | null; irrf: number | null };
      mei: { issqn: number | null; inss: number | null; cs: number | null; irrf: number | null };
      obs?: string;
    }) => {
      if (editingService) {
        handleCloseForm();
        updateService.mutate({
          id: editingService.id,
          data: {
            code: data.code,
            description: data.description,
            sn: data.sn,
            n: data.n,
            mei: data.mei,
            obs: data.obs,
          },
        });
      } else {
        createService
          .mutateAsync(data)
          .then(() => {
            handleCloseForm();
          })
          .catch(() => {
            // Error handled by mutation
          });
      }
    },
    [editingService, createService, updateService, handleCloseForm],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteServiceId) return;
    try {
      await deleteService.mutateAsync(deleteServiceId);
      setDeleteServiceId(null);
    } catch {
      // Error handled by mutation
    }
  }, [deleteServiceId, deleteService]);

  const isSaving = createService.isPending || updateService.isPending;

  useActionFromUrl("create", handleOpenCreate);

  return (
    <SidebarInset>
      <AdminHeader
        title={t("title")}
        actions={
          <>
            {/* Botão para importar serviços */}
            {canEdit && (
              <Button size="sm" variant="outline" onClick={handleOpenExportForm}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t("importService")}</span>
              </Button>
            )}
            {canCreate && (
              <Button size="sm" variant="outline" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("new")}</span>
              </Button>
            )}
          </>
        }
      />
      <PageContainer>
        <PageDescription>{t("description")}</PageDescription>
        <div className="space-y-section">
          {/* Search */}
          <SearchBar
            ref={searchRef}
            searchPlaceholder={t("searchPlaceholder")}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />

          <LoadingTransition
            ref={animationRef}
            isLoading={isLoading && !data}
            loadingMessage={tc("loading.default")}
          >
            {data?.data.length === 0 ? (
              <EmptyState
                title={filters.search ? t("empty.noSearchResults") : t("empty.noServices")}
                description={!filters.search ? t("empty.createFirst") : undefined}
                action={{
                  label: t("new"),
                  onClick: handleOpenCreate,
                  icon: Plus,
                }}
                showAction={!filters.search && canCreate}
              />
            ) : (
              <ServiceCard
                services={data?.data || []}
                servicesData={data}
                page={filters.page}
                limit={limit}
                onEdit={handleOpenEdit}
                onDelete={setDeleteServiceId}
                onPageChange={setPage}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            )}
          </LoadingTransition>
        </div>
      </PageContainer>

      {/* Create/Edit Dialog */}
      <ServiceFormDialog
        open={showFormDialog}
        onOpenChange={handleCloseForm}
        initialData={
          editingService
            ? {
                companyId: selectedCompanyId ?? "",
                code: editingService.code,
                description: editingService.description,
                sn: editingService.sn,
                n: editingService.n,
                mei: editingService.mei,
                obs: editingService.obs ?? undefined,
              }
            : {
                companyId: selectedCompanyId ?? "",
              }
        }
        onSubmit={handleSubmit}
        isEditing={!!editingService}
        isSaving={isSaving}
      />

      {/* Import from Template Dialog */}
      <ServiceImportDialog
        open={showExportServiceForm}
        onOpenChange={setShowExportServiceForm}
        companyId={selectedCompanyId ?? ""}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteServiceId} onOpenChange={(open) => !open && setDeleteServiceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>{t("deleteDescription")}</DialogDescription>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteServiceId(null)}>
              {tc("buttons.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteService.isPending}>
              {deleteService.isPending ? t("deleting") : tc("buttons.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
