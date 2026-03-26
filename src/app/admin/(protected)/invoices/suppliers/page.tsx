"use client";

import { useCallback, useRef, useState } from "react";
import { TaxRegime } from "@/schema/services.schema";
import { SupplierTaxRegime } from "@/schema/suppliers.schema";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCnpj } from "@/lib/cnpj-service-code";
import { useActionFromUrl } from "@/hooks/admin/use-action-from-url";
import { useSupplierPermissions } from "@/hooks/admin/use-resource-permissions";
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
  type Supplier,
} from "@/hooks/admin/use-suppliers";
import { useSuppliersFilters } from "@/hooks/admin/use-suppliers-filters";
import { usePaginationSize } from "@/hooks/use-pagination-size";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { SupplierFilters } from "@/components/admin/suppliers/supplier-filters";
import { SupplierFormDialog } from "@/components/admin/suppliers/supplier-form-dialog";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { RequirePermission } from "@/components/shared/require-permission";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarInset } from "@/components/ui/sidebar";

interface SupplierCardProps {
  supplier: Supplier;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (supplierId: number) => void;
  onDelete: (supplierId: number) => void;
}

function SupplierCard({ supplier, onEdit, onDelete, canEdit, canDelete }: SupplierCardProps) {
  const t = useTranslations("apps/suppliers");
  const tc = useTranslations("common");

  function formatTaxRegime(taxRegime: TaxRegime) {
    if (taxRegime === "sn") return "SN";
    if (taxRegime === "n") return "N";
    if (taxRegime === "mei") return "MEI";
  }

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-space-sm">
          {/* Top row: name on left, actions on right */}
          <div className="flex items-start justify-between gap-space-sm">
            <CardTitle className="min-w-0 flex-1">{supplier.name}</CardTitle>
            <div className="flex shrink-0 items-center gap-space-sm">
              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(supplier.id)}>
                        <Pencil className="h-4 w-4" />
                        {tc("buttons.edit")}
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(supplier.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        {tc("buttons.delete")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          {/* Bottom row: city on left, regime in center, CNPJ on right */}
          <div className="flex items-center gap-space-xl">
            <span className="text-base text-muted-foreground">{supplier.city}</span>
            <span className="text-base text-muted-foreground">{formatCnpj(supplier.cnpj)}</span>
            <Badge
              className={"ml-auto text-base bg-priority-medium text-priority-medium-foreground"}
            >
              {formatTaxRegime(supplier.taxRegime)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuppliersPage() {
  return (
    <RequirePermission resource="invoices">
      <ErrorBoundary fallback={AdminErrorFallback}>
        <SuppliersPageContent />
      </ErrorBoundary>
    </RequirePermission>
  );
}

function SuppliersPageContent() {
  const { canCreate, canEdit, canDelete } = useSupplierPermissions();

  const t = useTranslations("apps/suppliers");
  const tc = useTranslations("common");

  const searchRef = useRef<HTMLInputElement>(null);
  useShortcut("focus-search", () => searchRef.current?.focus());

  const {
    filters,
    searchInput,
    animationRef,
    setSearchInput,
    setTaxRegimeFilter,
    setCityFilter,
    setNameFilter,
    setCnpjFilter,
    setPage,
    clearFilters,
    hasActiveFilters,
  } = useSuppliersFilters();

  const limit = usePaginationSize();

  const { data, isLoading } = useSuppliers(
    {
      search: filters.search || undefined,
      taxRegime:
        (filters.taxRegime as string) !== "all"
          ? (filters.taxRegime as SupplierTaxRegime)
          : undefined,
      city: filters.city || undefined,
      name: filters.name || undefined,
      cnpj: filters.cnpj || undefined,
    },
    filters.page,
    limit,
  );

  const suppliers = data?.data ?? [];

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplierId, setDeleteSupplierId] = useState<number | null>(null);

  const handleOpenCreate = useCallback(() => {
    setEditingSupplier(null);
    setShowFormDialog(true);
  }, []);

  const handleOpenEdit = useCallback((supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowFormDialog(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowFormDialog(false);
    setEditingSupplier(null);
  }, []);

  const handleSubmit = useCallback(
    (data: { cnpj: string; name: string; city: string; taxRegime: SupplierTaxRegime }) => {
      if (editingSupplier) {
        handleCloseForm();
        updateSupplier.mutate({
          id: editingSupplier.id,
          data: {
            cnpj: data.cnpj,
            name: data.name,
            city: data.city,
            taxRegime: data.taxRegime,
          },
        });
      } else {
        createSupplier
          .mutateAsync(data)
          .then(() => {
            handleCloseForm();
          })
          .catch(() => {
            // Error handled by mutation
          });
      }
    },
    [editingSupplier, createSupplier, updateSupplier, handleCloseForm],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteSupplierId) return;
    try {
      await deleteSupplier.mutateAsync(deleteSupplierId);
      setDeleteSupplierId(null);
    } catch {
      // Error handled by mutation
    }
  }, [deleteSupplierId, deleteSupplier]);

  const isSaving = createSupplier.isPending || updateSupplier.isPending;

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
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            hasActiveFilters={!!hasActiveFilters}
            onClear={clearFilters}
          >
            <SupplierFilters
              taxRegimeFilter={filters.taxRegime}
              onTaxRegimeFilterChange={setTaxRegimeFilter}
              onNameFilter={setNameFilter}
              onCityFilter={setCityFilter}
              onCnpjFilter={setCnpjFilter}
              t={t}
            />
          </SearchBar>

          <LoadingTransition
            ref={animationRef}
            isLoading={isLoading && !data}
            loadingMessage={tc("loading.default")}
          >
            {suppliers.length === 0 ? (
              <EmptyState
                title={hasActiveFilters ? t("empty.noSearchResults") : t("empty.noSuppliers")}
                description={!hasActiveFilters ? t("empty.createFirst") : undefined}
                action={{
                  label: t("new"),
                  onClick: handleOpenCreate,
                  icon: Plus,
                }}
                showAction={!hasActiveFilters && canCreate}
              />
            ) : (
              <div className="grid gap-space-lg sm:grid-cols-2">
                {suppliers.map((supplier) => (
                  <SupplierCard
                    key={supplier.id}
                    supplier={supplier}
                    onEdit={() => handleOpenEdit(supplier)}
                    onDelete={() => setDeleteSupplierId(supplier.id)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                ))}
              </div>
            )}
          </LoadingTransition>

          {data && (
            <DataPagination
              page={filters.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={limit}
              onPageChange={setPage}
            />
          )}
        </div>
      </PageContainer>

      {/* Create/Edit Dialog */}
      <SupplierFormDialog
        open={showFormDialog}
        onOpenChange={handleCloseForm}
        initialData={
          editingSupplier
            ? {
                cnpj: editingSupplier.cnpj,
                name: editingSupplier.name,
                city: editingSupplier.city,
                taxRegime: editingSupplier.taxRegime,
              }
            : undefined
        }
        onSubmit={handleSubmit}
        isEditing={!!editingSupplier}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteSupplierId} onOpenChange={(open) => !open && setDeleteSupplierId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>{t("deleteDescription")}</DialogDescription>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSupplierId(null)}>
              {tc("buttons.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteSupplier.isPending}
            >
              {deleteSupplier.isPending ? t("deleting") : tc("buttons.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarInset>
  );
}
