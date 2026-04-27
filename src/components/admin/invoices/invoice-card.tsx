"use client";

import type { InvoiceStatus } from "@/schema/invoices.schema";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { InvoiceWithRelations } from "@/hooks/admin/use-invoices";
import { useDateFormat } from "@/hooks/use-date-format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatPct(rate: number | null | undefined): string {
  if (rate == null) return "NT";
  return `${rate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatCnpj(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function computeTaxes(
  valueCents: number,
  materialCents: number,
  rates: NonNullable<InvoiceWithRelations["service"]>["taxRates"] | undefined,
  invoiceOverrides?: {
    issqnPercent?: number | null;
    inssPercent?: number | null;
    csPercent?: number | null;
    irrfPercent?: number | null;
  },
) {
  const r = rates ?? { issqn: null, inss: null, cs: null, irrf: null };

  // Per-invoice override takes priority over service rate
  const issqnRate = invoiceOverrides?.issqnPercent ?? r.issqn;
  const inssRate = invoiceOverrides?.inssPercent ?? r.inss;
  const csRate = invoiceOverrides?.csPercent ?? r.cs;
  const irrfRate = invoiceOverrides?.irrfPercent ?? r.irrf;

  const issqn = issqnRate != null ? Math.round(valueCents * (issqnRate / 100)) : null;
  const inss =
    inssRate != null ? Math.round((valueCents - materialCents) * (inssRate / 100)) : null;
  const csRaw = csRate != null ? valueCents * (csRate / 100) : null;
  const cs = csRaw != null && csRaw >= 1000 ? Math.round(csRaw) : null;
  const irrfRaw = irrfRate != null ? valueCents * (irrfRate / 100) : null;
  const irrf = irrfRaw != null && irrfRaw >= 1000 ? Math.round(irrfRaw) : null;

  return { issqn, inss, cs, irrf };
}

const REGIME_ABBR: Record<string, string> = { sn: "SN", n: "N", mei: "MEI" };

// ─── props ──────────────────────────────────────────────────────────────────

export interface InvoiceCardProps {
  invoice: InvoiceWithRelations;
  canEdit: boolean;
  canDelete: boolean;
  onStatusChange: (invoiceId: string, status: InvoiceStatus) => void;
  onEdit: (invoiceId: string) => void;
  onDelete: (invoiceId: string) => void;
}

// ─── component ──────────────────────────────────────────────────────────────

export function InvoiceCard({ invoice, canEdit, canDelete, onEdit, onDelete }: InvoiceCardProps) {
  const tc = useTranslations("common");
  const { formatDate } = useDateFormat();

  const rates = invoice.service?.taxRates;
  const { issqn, inss, cs, irrf } = computeTaxes(
    invoice.valueCents,
    invoice.materialDeductionCents,
    rates,
    {
      issqnPercent: invoice.issqnPercent,
      inssPercent: invoice.inssPercent,
      csPercent: invoice.csPercent,
      irrfPercent: invoice.irrfPercent,
    },
  );

  const isOverdue =
    invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== "paid";

  return (
    <tr
      className={`border-b border-border transition-colors hover:bg-muted/30${isOverdue ? " bg-destructive/5" : ""}`}
    >
      {/* 1. CNPJ Prestador */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-xs">
        {invoice.supplier?.cnpj ? formatCnpj(invoice.supplier.cnpj) : "—"}
      </td>
      {/* 2. Nome Prestador */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-xs">
        {invoice.supplier?.name ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[160px] truncate cursor-default">
                {invoice.supplier.name}
              </span>
            </TooltipTrigger>
            <TooltipContent>{invoice.supplier.name}</TooltipContent>
          </Tooltip>
        ) : (
          "—"
        )}
      </td>
      {/* 3. Cidade */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-xs">
        {invoice.supplier?.city}
      </td>
      {/* 4. Regime de Tributação */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-center text-xs">
        {invoice.supplier?.taxRegime
          ? (REGIME_ABBR[invoice.supplier.taxRegime] ?? invoice.supplier.taxRegime)
          : "—"}
      </td>
      {/* 5. Cód Serv */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-xs">
        {invoice.service?.code}
      </td>
      {/* 6. Desc Serv */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-xs">
        {invoice.service?.description ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[160px] truncate cursor-default">
                {invoice.service.description}
              </span>
            </TooltipTrigger>
            <TooltipContent>{invoice.service.description}</TooltipContent>
          </Tooltip>
        ) : (
          "NT"
        )}
      </td>
      {/* 7. Data Entrada */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-xs">
        {invoice.entryDate ? formatDate(invoice.entryDate, { dateStyle: "short" }) : "—"}
      </td>
      {/* 8. Data Emissão */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-xs">
        {invoice.issueDate ? formatDate(invoice.issueDate, { dateStyle: "short" }) : "—"}
      </td>
      {/* 9. Data Venc */}
      <td
        className={`whitespace-nowrap border-r border-border px-2 py-1 text-xs${isOverdue ? " font-medium text-destructive" : ""}`}
      >
        {invoice.dueDate ? formatDate(invoice.dueDate, { dateStyle: "short" }) : "—"}
      </td>
      {/* 10. Numero NF */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-xs">
        {invoice.invoiceNumber}
      </td>
      {/* 11. Valor NF */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-right text-xs">
        {formatBRL(invoice.valueCents)}
      </td>
      {/* 12. Ded Mat */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-right text-xs">
        {invoice.materialDeductionCents > 0 ? formatBRL(invoice.materialDeductionCents) : "—"}
      </td>
      {/* 13. Alíquota ISSQN */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-right text-xs">
        {formatPct(rates?.issqn)}
      </td>
      {/* 14. ISSQN */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-right text-xs">
        {issqn != null ? formatBRL(issqn) : "NT"}
      </td>
      {/* 15. Alíquota INSS */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-right text-xs">
        {formatPct(rates?.inss)}
      </td>
      {/* 16. INSS */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-right text-xs">
        {inss != null ? formatBRL(inss) : "NT"}
      </td>
      {/* 17. Alíquota CS */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-right text-xs">
        {formatPct(rates?.cs)}
      </td>
      {/* 18. CS */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-right text-xs">
        {cs != null ? formatBRL(cs) : "NT"}
      </td>
      {/* 19. Alíquota IRRF */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-right text-xs">
        {formatPct(rates?.irrf)}
      </td>
      {/* 20. IRRF */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-right text-xs">
        {irrf != null ? formatBRL(irrf) : "NT"}
      </td>
      {/* 21. Líquido a receber */}
      <td className="whitespace-nowrap border-r border-border px-2 py-1 text-right text-xs font-semibold text-success">
        {formatBRL(invoice.netAmountCents)}
      </td>
      {/* Actions */}
      {(canEdit || canDelete) && (
        <td className="px-2 py-1 text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(invoice.id)}>
                  <Pencil className="h-4 w-4" />
                  {tc("buttons.edit")}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem onClick={() => onDelete(invoice.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                  {tc("buttons.delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}
    </tr>
  );
}
