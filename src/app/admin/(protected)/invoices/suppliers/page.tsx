"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { SupplierTaxRegime } from "@/schema/suppliers.schema";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionFromUrl } from "@/hooks/admin/use-action-from-url";
import { useSupplierPermissions } from "@/hooks/admin/use-resource-permissions";
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
  type Supplier,
} from "@/hooks/admin/use-suppliers";
import { useDebounce } from "@/hooks/use-debounce";
import { AdminHeader } from "@/components/admin/admin-header";
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";
import { SupplierFormDialog } from "@/components/admin/suppliers/supplier-form-dialog";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { RequirePermission } from "@/components/shared/require-permission";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarInset } from "@/components/ui/sidebar";

interface SupplierCardProps {
  supplier: Supplier;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (supplierCnpj: string) => void;
  onDelete: (supplierCnpj: string) => void;
}

function SupplierCard({ supplier, onEdit, onDelete, canEdit, canDelete }: SupplierCardProps) {
  const t = useTranslations("apps/suppliers");
  const tc = useTranslations("common");

  return (
    <Card>
      <CardContent>
        <div>
          <div className="flex items-center gap-space-lg">
            {/* Supplier Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-space-sm">
                <CardTitle>{supplier.name}</CardTitle>
              </div>
              <div className="flex items-center gap-space-sm truncate text-sm text-muted-foreground">
                {<span>{supplier.cnpj}</span>}
                {<span>{supplier.city}</span>}
              </div>
            </div>
            <div className="hidden items-center gap-space-sm sm:flex">
              <Badge className={"bg-priority-medium text-priority-medium-foreground"}>
                {t(`taxRegimes.${supplier.taxRegime}`)}
              </Badge>
            </div>
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => onEdit(supplier.cnpj)}>
                      <Pencil className="h-4 w-4" />
                      {tc("buttons.edit")}
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(supplier.cnpj)}
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
      </CardContent>
    </Card>
  );
}

export default function TaskListsPage() {
  return (
    <RequirePermission resource="suppliers">
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

  const { data: suppliers, isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplierCnpj, setDeleteSupplierCnpj] = useState<string | null>(null);

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
    (data: {
      cnpj: string;
      name: string;
      city: string;
      taxRegime: SupplierTaxRegime;
      obs?: string;
    }) => {
      if (editingSupplier) {
        // Close form immediately for instant feedback
        handleCloseForm();

        // Fire mutation (optimistic update handles the rest)
        updateSupplier.mutate({
          cnpj: editingSupplier.cnpj,
          data: {
            name: data.name,
            city: data.city,
            taxRegime: data.taxRegime,
            obs: data.obs,
          },
        });
      } else {
        // Create operations need await
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
    if (!deleteSupplierCnpj) return;
    try {
      await deleteSupplier.mutateAsync(deleteSupplierCnpj);
      setDeleteSupplierCnpj(null);
    } catch {
      // Error handled by mutation
    }
  }, [deleteSupplierCnpj, deleteSupplier]);

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    if (!debouncedSearch) return suppliers;

    const searchLower = debouncedSearch.toLowerCase();
    return suppliers.filter(
      (supplier) =>
        supplier.cnpj ||
        supplier.name.toLowerCase().includes(searchLower) ||
        supplier.city.toLowerCase().includes(searchLower) ||
        supplier.taxRegime.toLowerCase().includes(searchLower),
    );
  }, [suppliers, debouncedSearch]);

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
            searchValue={search}
            onSearchChange={setSearch}
          />

          <LoadingTransition
            isLoading={isLoading && !suppliers}
            loadingMessage={tc("loading.default")}
          >
            {filteredSuppliers?.length === 0 ? (
              <EmptyState
                title={search ? t("empty.noSearchResults") : t("empty.noSuppliers")}
                description={!search ? t("empty.createFirst") : undefined}
                action={{
                  label: t("new"),
                  onClick: handleOpenCreate,
                  icon: Plus,
                }}
                showAction={!search && canCreate}
              />
            ) : (
              <div className="grid gap-space-lg sm:grid-cols-2 lg:grid-cols-3">
                {filteredSuppliers?.map((supplier) => (
                  <SupplierCard
                    key={supplier.cnpj}
                    supplier={supplier}
                    onEdit={() => handleOpenEdit(supplier)}
                    onDelete={() => setDeleteSupplierCnpj(supplier.cnpj)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                ))}
              </div>
            )}
          </LoadingTransition>
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
                obs: editingSupplier.obs ?? undefined,
              }
            : undefined
        }
        onSubmit={handleSubmit}
        isEditing={!!editingSupplier}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteSupplierCnpj}
        onOpenChange={(open) => !open && setDeleteSupplierCnpj(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>{t("deleteDescription")}</DialogDescription>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSupplierCnpj(null)}>
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
