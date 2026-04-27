"use client";

import type { InvoiceStatus } from "@/schema/invoices.schema";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PaginationSize } from "@/lib/preferences";
import type { InvoiceWithRelations } from "@/hooks/admin/use-invoices";
import type { InvoicePermissions } from "@/hooks/admin/use-resource-permissions";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { computeTaxes, InvoiceCard } from "./invoice-card";

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
  taxFilters?: string[];

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
  taxFilters = [],
  _isUpdating,
  _isDeleting,
  onPageChange,
  onStatusChange,
  onCreate,
  onEdit,
  onDelete,
}: InvoicesListViewProps) {
  const t = useTranslations("apps/invoices");
  const uniqueInvoices = invoices.filter(
    (inv, idx, arr) => arr.findIndex((i) => i.id === inv.id) === idx,
  );

  const filteredInvoices =
    taxFilters.length === 0
      ? uniqueInvoices
      : uniqueInvoices.filter((inv) => {
          const { issqn, inss, cs, irrf } = computeTaxes(
            inv.valueCents,
            inv.materialDeductionCents,
            inv.service?.taxRates,
            {
              issqnPercent: inv.issqnPercent,
              inssPercent: inv.inssPercent,
              csPercent: inv.csPercent,
              irrfPercent: inv.irrfPercent,
            },
          );
          return taxFilters.every((tax) => {
            if (tax === "issqn") return issqn != null;
            if (tax === "inss") return inss != null;
            if (tax === "cs") return cs != null;
            if (tax === "irrf") return irrf != null;
            return true;
          });
        });

  const totals = filteredInvoices.reduce(
    (acc, inv) => {
      const { issqn, inss, cs, irrf } = computeTaxes(
        inv.valueCents,
        inv.materialDeductionCents,
        inv.service?.taxRates,
        {
          issqnPercent: inv.issqnPercent,
          inssPercent: inv.inssPercent,
          csPercent: inv.csPercent,
          irrfPercent: inv.irrfPercent,
        },
      );
      return {
        value: acc.value + inv.valueCents,
        deduction: acc.deduction + inv.materialDeductionCents,
        issqn: acc.issqn + (issqn ?? 0),
        inss: acc.inss + (inss ?? 0),
        cs: acc.cs + (cs ?? 0),
        irrf: acc.irrf + (irrf ?? 0),
        net: acc.net + (inv.netAmountCents ?? 0),
      };
    },
    { value: 0, deduction: 0, issqn: 0, inss: 0, cs: 0, irrf: 0, net: 0 },
  );

  function fmtBRL(cents: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      cents / 100,
    );
  }

  return (
    <>
      {/* Invoice Table */}
      {filteredInvoices.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/80">
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide">
                  {t("table.cnpj")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide">
                  {t("table.supplierName")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide">
                  {t("table.city")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide">
                  {t("table.taxRegime")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide">
                  {t("table.serviceCode")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide">
                  {t("table.serviceDescription")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide">
                  {t("table.entryDate")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide">
                  {t("table.issueDate")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide">
                  {t("table.dueDate")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide">
                  {t("table.invoiceNumber")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                  {t("table.value")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                  {t("table.deduction")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                  {t("table.aliquotaISSQN")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                  {t("table.issqn")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                  {t("table.aliquotaINSS")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                  {t("table.inss")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                  {t("table.aliquotaCS")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                  {t("table.cs")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                  {t("table.aliquotaIRRF")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                  {t("table.irrf")}
                </th>
                <th className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs font-bold uppercase tracking-wide">
                  {t("table.netAmount")}
                </th>
                {(permissions.canEdit || permissions.canDelete) && <th className="px-2 py-1.5" />}
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  canEdit={permissions.canEdit}
                  canDelete={permissions.canDelete}
                  onStatusChange={onStatusChange}
                  onEdit={() => onEdit(invoice.id)}
                  onDelete={() => onDelete(invoice.id)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="sticky bottom-0 border-t-2 border-border bg-muted/90 font-bold">
                {/* 1-10: label + empty spacers */}
                <td
                  colSpan={10}
                  className="border-r border-border px-2 py-1.5 text-xs uppercase tracking-wide"
                >
                  {t("table.total")}
                </td>
                {/* 11. Valor NF */}
                <td className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs">
                  {fmtBRL(totals.value)}
                </td>
                {/* 12. Ded Mat */}
                <td className="border-r border-border px-2 py-1.5" />
                {/* 13. Alíquota ISSQN — skip */}
                <td className="border-r border-border px-2 py-1.5" />
                {/* 14. ISSQN */}
                <td className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs">
                  {totals.issqn > 0 ? fmtBRL(totals.issqn) : ""}
                </td>
                {/* 15. Alíquota INSS — skip */}
                <td className="border-r border-border px-2 py-1.5" />
                {/* 16. INSS */}
                <td className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs">
                  {totals.inss > 0 ? fmtBRL(totals.inss) : "—"}
                </td>
                {/* 17. Alíquota CS — skip */}
                <td className="border-r border-border px-2 py-1.5" />
                {/* 18. CS */}
                <td className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs">
                  {totals.cs > 0 ? fmtBRL(totals.cs) : "—"}
                </td>
                {/* 19. Alíquota IRRF — skip */}
                <td className="border-r border-border px-2 py-1.5" />
                {/* 20. IRRF */}
                <td className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs">
                  {totals.irrf > 0 ? fmtBRL(totals.irrf) : "—"}
                </td>
                {/* 21. Líquido a receber */}
                <td className="whitespace-nowrap border-r border-border px-2 py-1.5 text-right text-xs text-success">
                  {fmtBRL(totals.net)}
                </td>
                {/* actions spacer */}
                {(permissions.canEdit || permissions.canDelete) && <td />}
              </tr>
            </tfoot>
          </table>
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
