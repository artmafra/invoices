"use client";

import { useCallback, useRef } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CreateSupplierInput } from "@/validations/supplier.validations";
import { useActionFromUrl } from "@/hooks/admin/use-action-from-url";
import { useSupplierPermissions } from "@/hooks/admin/use-resource-permissions";
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSupplier,
  useSuppliers,
  useUpdateSupplier,
} from "@/hooks/admin/use-suppliers";
import { useSuppliersActions } from "@/hooks/admin/use-suppliers-actions";
import { useSuppliersDialogs } from "@/hooks/admin/use-suppliers-dialogs";
import { useSuppliersFilters } from "@/hooks/admin/use-suppliers-filters";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
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

export function SuppliersPageContent() {
  const t = useTranslations("apps/suppliers");
  const tc = useTranslations("common");
  const permissions = useSupplierPermissions();

  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  // Filters with URL persistence
  const {
    filters,
    searchInput,
    animationRef,
    setSearchInput,
    setPage,
    setTaxRegimeFilter,
    setCityFilter,
    clearFilters,
    hasActiveFilters,
  } = useSuppliersFilters();

  const limit = usePaginationSize();

  // Dialog state
  const {
    dialogs,
    openCreateDialog,
    openEditDialog,
    closeFormDialog,
    openDeleteConfirm,
    closeDeleteConfirm,
  } = useSuppliersDialogs();

  // Queries and mutations
  const { data, isLoading } = useSuppliers(
    {
      search: filters.search || undefined,
      taxRegime: filters.taxRegime,
      city: filters.city,
    },
    filters.page,
    limit,
  );

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  // Action handlers with permission guards
  const actions = useSuppliersActions({
    permissions,
    createMutation: createSupplier,
    updateMutation: updateSupplier,
    deleteMutation: deleteSupplier,
    onCreateSuccess: closeFormDialog,
    onUpdateSuccess: closeFormDialog,
    onDeleteSuccess: closeDeleteConfirm,
  });

  const handleSubmit = useCallback(
    async (data: CreateSupplierInput) => {
      if (dialogs.editingSupplierCnpj) {
        await actions.handleUpdate({
          cnpj: dialogs.editingSupplierCnpj,
          data,
        });
      } else {
        await actions.handleCreate(data);
      }
    },
    [dialogs.editingSupplierCnpj, actions],
  );

  const handleOpenEdit = useCallback(
    (cnpj: string) => {
      const supplier = data?.data.find((s) => s.cnpj === cnpj);
      if (supplier) {
        openEditDialog(cnpj, {
          cnpj: supplier.cnpj,
          name: supplier.name,
          city: supplier.city,
          taxRegime: supplier.taxRegime,
          obs: supplier.obs || undefined,
        });
      }
    },
    [data?.data, openEditDialog],
  );

  const handleDelete = useCallback(async () => {
    if (!dialogs.deleteSupplierCnpj) return;
    await actions.handleDelete(dialogs.deleteSupplierCnpj);
  }, [dialogs.deleteSupplierCnpj, actions]);

  // Handle action from URL (e.g., from command palette)
  useActionFromUrl("create", openCreateDialog);

  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <SidebarInset>
        <AdminHeader
          title={t("title")}
          actions={
            permissions.canCreate && (
              <Button size="sm" variant="outline" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("new")}</span>
              </Button>
            )
          }
        />
        <PageContainer>
          <PageDescription>{t("description")}</PageDescription>
          <div className="space-y-section">
            {/* Search & Filters */}
            <SearchBar
              ref={searchRef}
              searchPlaceholder={t("searchPlaceholder")}
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              hasActiveFilters={hasActiveFilters}
              onClear={clearFilters}
            >
              {/* TODO: Add SuppliersFilters component */}
            </SearchBar>

            <LoadingTransition
              ref={animationRef}
              isLoading={isLoading && !data}
              loadingMessage={tc("loading.suppliers")}
            >
              {/* TODO: Add SuppliersListView component */}
              <div className="rounded-lg border p-space-xl text-center text-muted-foreground">
                {data?.data.length === 0 ? (
                  <div>
                    <p className="mb-space-md">{t("empty.title")}</p>
                    {permissions.canCreate && (
                      <Button onClick={openCreateDialog}>{t("empty.createFirst")}</Button>
                    )}
                  </div>
                ) : (
                  <div>
                    <p>Suppliers list view component needs to be created</p>
                    <p className="mt-space-sm text-sm">Found {data?.data.length || 0} suppliers</p>
                  </div>
                )}
              </div>
            </LoadingTransition>
          </div>
        </PageContainer>

        {/* Create/Edit Supplier Dialog */}
        {/* TODO: Create LazySupplierFormDialog component */}
        <Dialog open={dialogs.showFormDialog} onOpenChange={(open) => !open && closeFormDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogs.editingSupplierCnpj ? t("editTitle") : t("createTitle")}
              </DialogTitle>
            </DialogHeader>
            <DialogBody>
              <DialogDescription>
                {dialogs.editingSupplierCnpj ? t("editDescription") : t("createDescription")}
              </DialogDescription>
              <p className="mt-space-lg text-sm text-muted-foreground">
                Supplier form component needs to be created
              </p>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={closeFormDialog}>
                {tc("buttons.cancel")}
              </Button>
              <Button onClick={() => handleSubmit(dialogs.initialData as CreateSupplierInput)}>
                {actions.isCreating || actions.isUpdating
                  ? tc("buttons.processing")
                  : dialogs.editingSupplierCnpj
                    ? tc("buttons.save")
                    : tc("buttons.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!dialogs.deleteSupplierCnpj}
          onOpenChange={(open) => !open && closeDeleteConfirm()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("deleteTitle")}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <DialogDescription>{t("deleteDescription")}</DialogDescription>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={closeDeleteConfirm}>
                {tc("buttons.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={actions.isDeleting}>
                {actions.isDeleting ? tc("buttons.processing") : tc("buttons.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </ErrorBoundary>
  );
}
