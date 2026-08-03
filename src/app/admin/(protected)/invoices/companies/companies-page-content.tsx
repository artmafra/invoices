"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelectedCompany } from "@/contexts/company-context";
import { Loader2, Plus, Search } from "lucide-react";
import { includesNormalizedText, normalizeSearchText } from "@/lib/text-search";
import {
  useCompanies,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
} from "@/hooks/admin/use-companies";
import { useCompanyPermissions } from "@/hooks/admin/use-resource-permissions";
import { AdminHeader } from "@/components/admin/admin-header";
import { CompanyCard } from "@/components/admin/companies/company-card";
import { CompanyDeleteDialog } from "@/components/admin/companies/company-delete-dialog";
import {
  CompanyFormDialog,
  type CompanyFormValues,
} from "@/components/admin/companies/company-form-dialog";
import { ErrorAlert } from "@/components/shared/error-alert";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarInset } from "@/components/ui/sidebar";

export function CompaniesPageContent() {
  const router = useRouter();
  const { selectedCompanyId, setSelectedCompany } = useSelectedCompany();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<{
    id: string;
    cnpj: string;
    name: string;
    city: string;
  } | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);

  const { canCreate, canEdit, canDelete } = useCompanyPermissions();
  const { data, isLoading, error } = useCompanies({}, 1, 100);
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const companies = data?.data ?? [];

  const filtered = useMemo(() => {
    const q = normalizeSearchText(search.trim());
    if (!q) return companies;
    return companies.filter(
      (c) =>
        includesNormalizedText(c.name, q) ||
        c.cnpj.includes(q) ||
        includesNormalizedText(c.city, q),
    );
  }, [companies, search]);

  function handleSelect(id: string, name: string) {
    setSelectedCompany(id, name);
    router.push("/admin/invoices");
  }

  function handleCreate(data: CompanyFormValues) {
    createCompany.mutate(data, {
      onSuccess: () => setCreateOpen(false),
    });
  }

  function handleEdit(data: CompanyFormValues) {
    if (!editingCompany) return;
    updateCompany.mutate(
      { id: editingCompany.id, data },
      { onSuccess: () => setEditingCompany(null) },
    );
  }

  function handleDelete() {
    if (!deletingCompanyId) return;
    deleteCompany.mutate(deletingCompanyId, {
      onSuccess: () => {
        if (selectedCompanyId === deletingCompanyId) {
          setSelectedCompany(null, null);
        }
        setDeletingCompanyId(null);
      },
    });
  }

  return (
    <SidebarInset>
      <AdminHeader
        title="Selecione uma Empresa"
        actions={
          canCreate && (
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Empresa</span>
            </Button>
          )
        }
      />
      <PageContainer>
        <PageDescription>Escolha a empresa para visualizar suas notas fiscais</PageDescription>

        <div className="space-y-section">
          {/* Search */}
          <div className="relative w-full max-w-md">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por nome, CNPJ ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              disabled={isLoading}
            />
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando empresas...
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <ErrorAlert message="Erro ao carregar empresas. Verifique se o banco de dados está configurado corretamente." />
          )}

          {/* Empty */}
          {!isLoading && !error && filtered.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhuma empresa encontrada.</p>
          )}

          {/* Grid */}
          {!isLoading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onSelect={(id) => handleSelect(id, company.name)}
                  onEdit={(id) => {
                    const c = companies.find((c) => c.id === id);
                    if (c)
                      setEditingCompany({ id: c.id, cnpj: c.cnpj, name: c.name, city: c.city });
                  }}
                  onDelete={(id) => setDeletingCompanyId(id)}
                />
              ))}
            </div>
          )}
        </div>
      </PageContainer>

      <CompanyFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialData={{}}
        onSubmit={handleCreate}
        isEditing={false}
        isSaving={createCompany.isPending}
      />

      <CompanyFormDialog
        open={!!editingCompany}
        onOpenChange={(open) => {
          if (!open) setEditingCompany(null);
        }}
        initialData={editingCompany ?? {}}
        onSubmit={handleEdit}
        isEditing={true}
        isSaving={updateCompany.isPending}
      />
      <CompanyDeleteDialog
        open={!!deletingCompanyId}
        onOpenChange={(open) => {
          if (!open) setDeletingCompanyId(null);
        }}
        onConfirm={handleDelete}
        isPending={deleteCompany.isPending}
      />
    </SidebarInset>
  );
}
