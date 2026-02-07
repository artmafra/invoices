"use client";

import type { InvoiceStatus } from "@/schema/invoices.schema";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PaginationSize } from "@/lib/preferences";
import type { InvoiceWithRelations } from "@/hooks/admin/use-invoices";
import type { InvoicePermissions } from "@/hooks/admin/use-resource-permissions";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";

export interface InvoicesListViewProps {
  // Data
  invoices: InvoiceWithRelations[];
  invoicesData:
    | {
        data: InvoiceWithRelations[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
    | undefined;

  // Pagination
  page: number;
  limit: PaginationSize;

  // Permissions
  permissions: InvoicePermissions & { currentUserId: string | undefined; isLoading: boolean };

  // Filter state
  hasActiveFilters: boolean;

  // Mutation states (for future use)
  _isUpdating?: boolean;
  _isDeleting?: boolean;

  // Handlers
  onPageChange: (page: number) => void;
  onStatusChange: (invoiceId: string, status: InvoiceStatus) => void;
  onCreate: () => void;
  onEdit: (invoiceId: string) => void;
  onDelete: (invoiceId: string) => void;
}

export function InvoicesListView({
  invoices,
  invoicesData,
  page,
  limit,
  permissions,
  hasActiveFilters,
  _isUpdating,
  _isDeleting,
  onPageChange,
  onStatusChange,
  onCreate,
  onEdit,
  onDelete,
}: InvoicesListViewProps) {
  const t = useTranslations("apps/invoices");

  // Filter for paid invoices if needed
  const filteredInvoices = invoices.filter((invoice) => {
    return invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== "paid";
  });

  return (
    <>
      {/* Task Cards */}
      {filteredInvoices.length > 0 ? (
        <div className="space-y-space-md">
          <div className="flex flex-col gap-space-md">
            {/* {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                task={invoice}
                canEdit={permissions.canEdit}
                canDelete={permissions.canDelete}
                onStatusChange={onStatusChange}
                onEdit={() => onEdit(invoice.id)}
                onDelete={() => onDelete(invoice.id)}
              />
            ))} */}
          </div>
        </div>
      ) : (
        <EmptyState
          title={hasActiveFilters ? t("empty.noFilterResults") : t("empty.noInvoices")}
          action={{
            label: t("createButton"),
            onClick: onCreate,
            icon: Plus,
          }}
          showAction={!hasActiveFilters && permissions.canCreate}
        />
      )}

      {/* Pagination */}
      {invoicesData && (
        <DataPagination
          page={page}
          totalPages={invoicesData.totalPages}
          total={invoicesData.total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
