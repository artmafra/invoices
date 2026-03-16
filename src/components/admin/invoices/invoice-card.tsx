"use client";

import type { InvoiceStatus } from "@/schema/invoices.schema";
import { Building2, Calendar, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { InvoiceWithRelations } from "@/hooks/admin/use-invoices";
import { useDateFormat } from "@/hooks/use-date-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatPct(rate: number | null | undefined): string {
  if (rate == null) return "—";
  return `${rate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatCnpj(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function computeTaxes(
  valueCents: number,
  materialCents: number,
  rates: NonNullable<InvoiceWithRelations["service"]>["taxRates"] | undefined,
) {
  const r = rates ?? { issqn: null, inss: null, cs: null, irrf: null };

  const issqn = r.issqn != null ? Math.round(valueCents * (r.issqn / 100)) : null;
  const inss = r.inss != null ? Math.round((valueCents - materialCents) * (r.inss / 100)) : null;
  const csRaw = r.cs != null ? valueCents * (r.cs / 100) : null;
  const cs = csRaw != null && csRaw >= 1000 ? Math.round(csRaw) : null;
  const irrfRaw = r.irrf != null ? valueCents * (r.irrf / 100) : null;
  const irrf = irrfRaw != null && irrfRaw >= 1000 ? Math.round(irrfRaw) : null;

  return {
    issqn,
    inss,
    cs,
    irrf,
    csRetained: csRaw != null && csRaw < 1000,
    irrfRetained: irrfRaw != null && irrfRaw < 1000,
  };
}

// ─── status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InvoiceStatus, string> = {
  issued: "bg-priority-medium text-priority-medium-foreground",
  paid: "bg-success text-success-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

// ─── props ──────────────────────────────────────────────────────────────────

interface InvoiceCardProps {
  invoice: InvoiceWithRelations;
  canEdit: boolean;
  canDelete: boolean;
  onStatusChange: (invoiceId: string, status: InvoiceStatus) => void;
  onEdit: (invoiceId: string) => void;
  onDelete: (invoiceId: string) => void;
}

// ─── component ──────────────────────────────────────────────────────────────

export function InvoiceCard({ invoice, canEdit, canDelete, onEdit, onDelete }: InvoiceCardProps) {
  const t = useTranslations("apps/invoices");
  const tc = useTranslations("common");
  const { formatDate } = useDateFormat();

  const isOverdue =
    invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== "paid";

  const { issqn, inss, cs, irrf, csRetained, irrfRetained } = computeTaxes(
    invoice.valueCents,
    invoice.materialDeductionCents,
    invoice.service?.taxRates,
  );

  const taxRegimeLabel = invoice.supplier?.taxRegime
    ? t(`card.taxRegimes.${invoice.supplier.taxRegime}` as Parameters<typeof t>[0])
    : null;

  return (
    <Card className="overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-space-sm border-b px-space-lg py-space-md">
        <div className="flex items-center gap-space-sm">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-base font-semibold">NF #{invoice.invoiceNumber}</span>
        </div>

        <div className="flex items-center gap-space-sm">
          {isOverdue && (
            <Badge variant="destructive" className="hidden sm:inline-flex">
              {t("overdue")}
            </Badge>
          )}
          <Badge className={STATUS_CONFIG[invoice.status]}>
            {t(`status.${invoice.status}` as Parameters<typeof t>[0])}
          </Badge>

          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
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
                  <DropdownMenuItem
                    onClick={() => onDelete(invoice.id)}
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

      <CardContent className="space-y-space-lg pt-space-lg">
        {/* ── Supplier + Service + Dates ──────────────────────────────── */}
        <div className="grid gap-space-lg sm:grid-cols-3">
          {/* Supplier */}
          <div className="space-y-space-xs sm:col-span-1">
            <div className="flex items-center gap-space-xs text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {t("card.supplier")}
            </div>
            {invoice.supplier ? (
              <>
                <p className="truncate font-medium">{invoice.supplier.name}</p>
                <p className="text-xs text-muted-foreground">{formatCnpj(invoice.supplier.cnpj)}</p>
                <p className="text-xs text-muted-foreground">
                  {invoice.supplier.city}
                  {taxRegimeLabel && <span className="ml-1">· {taxRegimeLabel}</span>}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Service */}
          <div className="space-y-space-xs sm:col-span-1">
            <div className="flex items-center gap-space-xs text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FileText className="h-3 w-3" />
              {t("card.service")}
            </div>
            {invoice.service ? (
              <>
                <p className="font-medium">{invoice.service.code}</p>
                <p className="text-xs text-muted-foreground">{invoice.service.description}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Dates */}
          <div className="space-y-space-xs sm:col-span-1">
            <div className="flex items-center gap-space-xs text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {t("card.dates")}
            </div>
            <div className="space-y-space-xs text-sm">
              <div className="flex items-center justify-between gap-space-sm">
                <span className="text-muted-foreground">{t("card.entryDate")}</span>
                <span>{invoice.entryDate ? formatDate(invoice.entryDate) : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-space-sm">
                <span className="text-muted-foreground">{t("card.issueDate")}</span>
                <span>{invoice.issueDate ? formatDate(invoice.issueDate) : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-space-sm">
                <span className={isOverdue ? "text-destructive" : "text-muted-foreground"}>
                  {t("card.dueDate")}
                </span>
                <span className={isOverdue ? "font-medium text-destructive" : ""}>
                  {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                </span>
              </div>
              {/* Mobile overdue badge */}
              {isOverdue && (
                <Badge variant="destructive" className="mt-space-xs sm:hidden">
                  {t("overdue")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Taxes ──────────────────────────────────────────────────── */}
        <div className="space-y-space-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("card.taxes")}
          </p>

          <div className="space-y-space-xs text-sm">
            {/* Gross value */}
            <TaxRow label={t("card.grossValue")} value={formatBRL(invoice.valueCents)} />

            {/* Material deduction */}
            {invoice.materialDeductionCents > 0 && (
              <TaxRow
                label={t("card.materialDeduction")}
                value={`(${formatBRL(invoice.materialDeductionCents)})`}
                muted
              />
            )}

            <Separator className="my-space-xs" />

            {/* ISSQN */}
            {invoice.service?.taxRates?.issqn != null && (
              <TaxRow
                label={`ISSQN (${formatPct(invoice.service.taxRates.issqn)})`}
                value={formatBRL(issqn)}
              />
            )}

            {/* INSS */}
            {invoice.service?.taxRates?.inss != null && (
              <TaxRow
                label={`INSS (${formatPct(invoice.service.taxRates.inss)})`}
                value={formatBRL(inss)}
              />
            )}

            {/* CS */}
            {invoice.service?.taxRates?.cs != null && (
              <TaxRow
                label={`CS (${formatPct(invoice.service.taxRates.cs)})`}
                value={csRetained ? `— ${t("card.notRetained")}` : formatBRL(cs)}
                muted={csRetained}
              />
            )}

            {/* IRRF */}
            {invoice.service?.taxRates?.irrf != null && (
              <TaxRow
                label={`IRRF (${formatPct(invoice.service.taxRates.irrf)})`}
                value={irrfRetained ? `— ${t("card.notRetained")}` : formatBRL(irrf)}
                muted={irrfRetained}
              />
            )}
          </div>
        </div>

        <Separator />

        {/* ── Net amount ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-space-md py-space-sm">
          <span className="text-sm font-semibold">{t("card.netAmount")}</span>
          <span className="text-lg font-bold text-success">
            {formatBRL(invoice.netAmountCents)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── mini helper component ───────────────────────────────────────────────────

function TaxRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-space-sm ${muted ? "text-muted-foreground" : ""}`}
    >
      <span>{label}</span>
      <span className={muted ? "" : "font-medium"}>{value}</span>
    </div>
  );
}
