"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
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
import { useDebounce } from "@/hooks/use-debounce";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { ServiceCard } from "@/components/admin/services/service-card";
import { ServiceFormDialog } from "@/components/admin/services/service-form-dialog";
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

  const t = useTranslations("apps/services");
  const tc = useTranslations("common");

  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);

  // Check if any filters are active
  const hasActiveFilters = search.trim() !== "";

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearch("");
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingService(null);
    setShowFormDialog(true);
  }, []);

  const handleOpenEdit = useCallback(
    (serviceId: string) => {
      const service = services?.find((s) => s.id === serviceId);
      if (service) {
        setEditingService(service);
        setShowFormDialog(true);
      }
    },
    [services],
  );

  const handleCloseForm = useCallback(() => {
    setShowFormDialog(false);
    setEditingService(null);
  }, []);

  const handleSubmit = useCallback(
    (data: {
      code: string;
      description: string;
      sn: { issqn: number | null; inss: number | null; cs: number | null; irrf: number | null };
      n: { issqn: number | null; inss: number | null; cs: number | null; irrf: number | null };
      mei: { issqn: number | null; inss: number | null; cs: number | null; irrf: number | null };
      obs?: string;
    }) => {
      if (editingService) {
        // Close form immediately for instant feedback
        handleCloseForm();

        // Fire mutation (optimistic update handles the rest)
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
        // Create operations need await
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

  const filteredServices = useMemo(() => {
    if (!services) return [];

    return services.filter((service) => {
      // Search filter
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch =
          service.code.toLowerCase().includes(searchLower) ||
          service.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [services, debouncedSearch]);

  const isSaving = createService.isPending || updateService.isPending;

  // Handle action from URL (e.g., from command palette)
  useActionFromUrl("create", handleOpenCreate);

  return (
    <SidebarInset>
      <AdminHeader
        title={t("title")}
        actions={
          canCreate && (
            <Button size="sm" variant="outline" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("new")}</span>
            </Button>
          )
        }
      />
      <PageContainer>
        <PageDescription>{t("description")}</PageDescription>
        <div className="space-y-section">
          {/* Search */}
          <SearchBar
            ref={searchRef}
            searchPlaceholder={t("searchPlaceholder")}
            searchValue={search}
            onSearchChange={setSearch}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />

          <LoadingTransition
            isLoading={isLoading && !services}
            loadingMessage={tc("loading.default")}
          >
            {filteredServices?.length === 0 ? (
              <EmptyState
                title={search ? t("empty.noSearchResults") : t("empty.noServices")}
                description={!search ? t("empty.createFirst") : undefined}
                action={{
                  label: t("new"),
                  onClick: handleOpenCreate,
                  icon: Plus,
                }}
                showAction={!search && canCreate}
              />
            ) : (
              <ServiceCard
                services={filteredServices}
                onEdit={handleOpenEdit}
                onDelete={setDeleteServiceId}
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
                code: editingService.code,
                description: editingService.description,
                sn: editingService.sn,
                n: editingService.n,
                mei: editingService.mei,
                obs: editingService.obs ?? undefined,
              }
            : undefined
        }
        onSubmit={handleSubmit}
        isEditing={!!editingService}
        isSaving={isSaving}
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
