"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSelectedCompany } from "@/contexts/company-context";
import type { TaxRates } from "@/schema/services.schema";
import { Building2, Calculator, Calendar, CheckCircle2, FileDigit, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { extractCnpjDigits } from "@/lib/cnpj-service-code";
import { formatToReais, getDisplayValue } from "@/lib/currency-formatting";
import { useServices } from "@/hooks/admin/use-services";
import { useSuppliers } from "@/hooks/admin/use-suppliers";
import { useDebounce } from "@/hooks/use-debounce";
import { CnpjSelect } from "@/components/shared/cnpj-select";
import { LoadingButton } from "@/components/shared/loading-button";
import { ServiceSelect } from "@/components/shared/service-select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─────────────────────────────────────────────────────────────────────────────
// Tax calculation (mirrors invoice.service.ts server logic)
// ─────────────────────────────────────────────────────────────────────────────

interface TaxResult {
  issqnRate: number | null;
  issqnAmount: number;
  inssRate: number | null;
  inssAmount: number;
  csRate: number | null;
  csAmount: number;
  irrfRate: number | null;
  irrfAmount: number;
  netAmountCents: number;
}

function calculateTaxes(
  valueCents: number,
  materialDeductionCents: number,
  rates: TaxRates,
  inssOverride: number | null,
  irrfOverride: number | null,
  issqnOverride: number | null,
): TaxResult {
  const value = valueCents || 0;
  const material = materialDeductionCents || 0;
  let totalTax = 0;

  const inssRate = inssOverride !== null ? inssOverride : (rates.inss ?? null);
  const inssAmount = inssRate ? Math.round((value - material) * (inssRate / 100)) : 0;
  totalTax += inssAmount;

  const csAmountRaw = rates.cs ? value * (rates.cs / 100) : 0;
  const csAmount = rates.cs && csAmountRaw >= 1000 ? Math.round(csAmountRaw) : 0;
  totalTax += csAmount;

  const irrfRate = irrfOverride !== null ? irrfOverride : (rates.irrf ?? null);
  const irrfAmountRaw = irrfRate ? value * (irrfRate / 100) : 0;
  const irrfAmount = irrfRate && irrfAmountRaw >= 1000 ? Math.round(irrfAmountRaw) : 0;
  totalTax += irrfAmount;

  const issqnRate = issqnOverride !== null ? issqnOverride : (rates.issqn ?? null);
  const issqnAmount = issqnRate ? Math.round(value * (issqnRate / 100)) : 0;
  totalTax += issqnAmount;

  return {
    issqnRate,
    issqnAmount,
    inssRate,
    inssAmount,
    csRate: rates.cs,
    csAmount,
    irrfRate,
    irrfAmount,
    netAmountCents: value - totalTax,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatPercent(rate: number | null): string {
  if (rate === null || rate === undefined) return "—";
  return `${rate.toFixed(2).replace(".", ",")}%`;
}

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function toDisplayDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

function fromDisplayDate(s: string): Date {
  const [day, month, year] = s.split("/").map(Number);
  return new Date(year, month - 1, day);
}

function isValidDate(s: string): boolean {
  if (s.length < 10) return true; // still typing, no error yet
  const [day, month, year] = s.split("/").map(Number);
  if (!day || !month || !year) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

const today = toDisplayDate(new Date());

// ─────────────────────────────────────────────────────────────────────────────
// Draft persistence (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

const DRAFT_KEY = "invoice-entry-draft";

interface DraftState {
  entryDate: string;
  issueDate: string;
  dueDate: string;
  supplierCnpj: string;
  serviceCode: string | null;
  invoiceNumber: string;
  valueCents: number;
  valueDisplay: string;
  materialCents: number;
  materialDisplay: string;
  inssOverrideDisplay: string;
  irrfOverrideDisplay: string;
  issqnOverrideDisplay: string;
}

function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DraftState) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: DraftState) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceEntryCardProps {
  onSubmit: (data: {
    companyId: string;
    supplierCnpj: string;
    serviceCode: string;
    entryDate: Date;
    issueDate: Date;
    dueDate?: Date;
    valueCents: number;
    invoiceNumber: string;
    materialDeductionCents: number;
    inssPercent?: number;
    issqnPercent?: number;
    irrfPercent?: number;
    status: "issued";
  }) => Promise<void>;
  isSaving: boolean;
}

export function InvoiceEntryCard({ onSubmit, isSaving }: InvoiceEntryCardProps) {
  const t = useTranslations("apps/invoices");
  const { selectedCompanyId } = useSelectedCompany();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [entryDate, setEntryDate] = useState(() => loadDraft()?.entryDate ?? "");
  const [issueDate, setIssueDate] = useState(() => loadDraft()?.issueDate ?? "");
  const [dueDate, setDueDate] = useState(() => loadDraft()?.dueDate ?? "");
  const [supplierCnpj, setSupplierCnpj] = useState(() => loadDraft()?.supplierCnpj ?? "");
  const [serviceCode, setServiceCode] = useState<string | null>(
    () => loadDraft()?.serviceCode ?? null,
  );
  const [invoiceNumber, setInvoiceNumber] = useState(() => loadDraft()?.invoiceNumber ?? "");
  const [valueCents, setValueCents] = useState(() => loadDraft()?.valueCents ?? 0);
  const [valueDisplay, setValueDisplay] = useState(() => loadDraft()?.valueDisplay ?? "");
  const [materialCents, setMaterialCents] = useState(() => loadDraft()?.materialCents ?? 0);
  const [materialDisplay, setMaterialDisplay] = useState(() => loadDraft()?.materialDisplay ?? "");
  const [inssOverrideDisplay, setInssOverrideDisplay] = useState(
    () => loadDraft()?.inssOverrideDisplay ?? "",
  );
  const [irrfOverrideDisplay, setIrrfOverrideDisplay] = useState(
    () => loadDraft()?.irrfOverrideDisplay ?? "",
  );
  const [issqnOverrideDisplay, setIssqnOverrideDisplay] = useState(
    () => loadDraft()?.issqnOverrideDisplay ?? "",
  );
  const [issqnFocused, setIssqnFocused] = useState(false);

  // ── Persist draft on every change ───────────────────────────────────────────
  useEffect(() => {
    saveDraft({
      entryDate,
      issueDate,
      dueDate,
      supplierCnpj,
      serviceCode,
      invoiceNumber,
      valueCents,
      valueDisplay,
      materialCents,
      materialDisplay,
      inssOverrideDisplay,
      irrfOverrideDisplay,
      issqnOverrideDisplay,
    });
  }, [
    entryDate,
    issueDate,
    dueDate,
    supplierCnpj,
    serviceCode,
    invoiceNumber,
    valueCents,
    valueDisplay,
    materialCents,
    materialDisplay,
    inssOverrideDisplay,
    irrfOverrideDisplay,
    issqnOverrideDisplay,
  ]);

  // ── Supplier lookup ─────────────────────────────────────────────────────────
  const debouncedCnpj = useDebounce(extractCnpjDigits(supplierCnpj), 400);
  const { data: supplierPage } = useSuppliers(
    { cnpj: debouncedCnpj || undefined, companyId: selectedCompanyId ?? undefined },
    1,
    5,
  );
  const supplier = supplierPage?.data.find(
    (s) => extractCnpjDigits(s.cnpj) === extractCnpjDigits(supplierCnpj),
  );

  // ── Service lookup ──────────────────────────────────────────────────────────
  const debouncedCode = useDebounce(serviceCode ?? "", 400);
  const { data: servicePage } = useServices(
    { search: debouncedCode || undefined, companyId: selectedCompanyId ?? undefined },
    1,
    10,
  );
  const service = servicePage?.data.find((s) => s.code === serviceCode);

  // ── Tax rates for the selected supplier's regime ────────────────────────────
  const taxRates: TaxRates = useMemo(() => {
    if (!service || !supplier) return { issqn: null, inss: null, cs: null, irrf: null };
    const regime = supplier.taxRegime as "sn" | "n" | "mei";
    return service[regime] ?? { issqn: null, inss: null, cs: null, irrf: null };
  }, [service, supplier]);

  // INSS override: empty string → use service rate; "0" or value → override
  const inssOverride: number | null = useMemo(() => {
    const trimmed = inssOverrideDisplay.trim();
    if (trimmed === "" || trimmed === undefined) return null;
    const n = parseFloat(trimmed.replace(",", "."));
    return isNaN(n) ? null : n;
  }, [inssOverrideDisplay]);

  // IRRF override: empty string → use service rate; value → override
  const irrfOverride: number | null = useMemo(() => {
    const trimmed = irrfOverrideDisplay.trim();
    if (trimmed === "") return null;
    const n = parseFloat(trimmed.replace(",", "."));
    return isNaN(n) ? null : n;
  }, [irrfOverrideDisplay]);

  // ISSQN override (SN only): accepted only if between 2% and 5%
  const issqnOverride: number | null = useMemo(() => {
    const trimmed = issqnOverrideDisplay.replace("%", "").replace(",", ".").trim();
    if (trimmed === "") return null;
    const n = parseFloat(trimmed);
    if (isNaN(n) || n < 2 || n > 5) return null;
    return n;
  }, [issqnOverrideDisplay]);

  // ── Live tax calculation ────────────────────────────────────────────────────
  const taxes = useMemo(
    () =>
      calculateTaxes(
        valueCents,
        materialCents,
        taxRates,
        inssOverride,
        irrfOverride,
        issqnOverride,
      ),
    [valueCents, materialCents, taxRates, inssOverride, irrfOverride, issqnOverride],
  );

  // ── Regime display ──────────────────────────────────────────────────────────
  const regimeLabel: Record<string, string> = { sn: "SN", n: "N", mei: "MEI" };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const isSubmittingRef = useRef(false);

  async function handleSubmit() {
    if (isSubmittingRef.current) return;
    if (!selectedCompanyId || !supplierCnpj || !serviceCode || !valueCents || !invoiceNumber)
      return;

    isSubmittingRef.current = true;
    try {
      await onSubmit({
        companyId: selectedCompanyId,
        supplierCnpj: extractCnpjDigits(supplierCnpj),
        serviceCode,
        entryDate: fromDisplayDate(entryDate),
        issueDate: fromDisplayDate(issueDate),
        dueDate: dueDate ? fromDisplayDate(dueDate) : undefined,
        valueCents,
        invoiceNumber,
        materialDeductionCents: materialCents,
        inssPercent: inssOverride !== null ? inssOverride : undefined,
        issqnPercent: issqnOverride !== null ? issqnOverride : undefined,
        irrfPercent: irrfOverride !== null ? irrfOverride : undefined,
        status: "issued",
      });

      // Reset form + clear draft
      clearDraft();
      setEntryDate("");
      setIssueDate("");
      setDueDate("");
      setSupplierCnpj("");
      setServiceCode(null);
      setInvoiceNumber("");
      setValueCents(0);
      setValueDisplay("");
      setMaterialCents(0);
      setMaterialDisplay("");
      setInssOverrideDisplay("");
      setIrrfOverrideDisplay("");
      setIssqnOverrideDisplay("");
    } finally {
      isSubmittingRef.current = false;
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* ── CARD 1: Dados da Nota ──────────────────────────────────────── */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-gap-sm">
            <FileDigit className="w-5 h-5" />
            {t("newTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          {/* Entry date + Issue date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryDate">{t("fields.entryDate")}</Label>
              <Tooltip open={!isValidDate(entryDate)}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Input
                      id="entryDate"
                      value={entryDate}
                      onChange={(e) => {
                        const next = e.target.value;
                        setEntryDate(
                          next.length >= entryDate.length ? formatDateInput(next) : next,
                        );
                      }}
                      placeholder="dd/mm/aaaa"
                      maxLength={10}
                      className={`pl-9${!isValidDate(entryDate) ? " border-destructive" : ""}`}
                    />
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">{t("errors.invalidDate")}</TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDate">{t("fields.issueDate")}</Label>
              <Tooltip
                open={
                  !isValidDate(issueDate) ||
                  (isValidDate(issueDate) &&
                    isValidDate(entryDate) &&
                    issueDate.length === 10 &&
                    entryDate.length === 10 &&
                    fromDisplayDate(issueDate) > fromDisplayDate(entryDate))
                }
              >
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Input
                      id="issueDate"
                      value={issueDate}
                      onChange={(e) => {
                        const next = e.target.value;
                        setIssueDate(
                          next.length >= issueDate.length ? formatDateInput(next) : next,
                        );
                      }}
                      placeholder="dd/mm/aaaa"
                      maxLength={10}
                      className={`pl-9${
                        !isValidDate(issueDate) ||
                        (isValidDate(issueDate) &&
                          isValidDate(entryDate) &&
                          issueDate.length === 10 &&
                          entryDate.length === 10 &&
                          fromDisplayDate(issueDate) > fromDisplayDate(entryDate))
                          ? " border-destructive"
                          : ""
                      }`}
                    />
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {!isValidDate(issueDate)
                    ? t("errors.invalidDate")
                    : t("errors.issueDateAfterEntryDate")}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">{t("fields.dueDate")}</Label>
            <Tooltip open={!!dueDate && !isValidDate(dueDate)}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Input
                    id="dueDate"
                    value={dueDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setDueDate(next.length >= dueDate.length ? formatDateInput(next) : next);
                    }}
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    className={`pl-9${!!dueDate && !isValidDate(dueDate) ? " border-destructive" : ""}`}
                  />
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">{t("errors.invalidDate")}</TooltipContent>
            </Tooltip>
          </div>

          <Separator />

          {/* CNPJ */}
          <div className="space-y-2">
            <Label>
              <Building2 className="w-4 h-4 inline-block mr-1 text-muted-foreground" />
              {t("fields.supplierCnpj")}
            </Label>
            <CnpjSelect
              value={supplierCnpj || null}
              onChange={(v) => setSupplierCnpj(v ?? "")}
              placeholder={t("fields.supplierCnpjPlaceholder")}
              companyId={selectedCompanyId}
            />
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label>{t("fields.serviceCode")}</Label>
            <ServiceSelect
              value={serviceCode}
              onChange={(v) => setServiceCode(v)}
              placeholder={t("fields.serviceCodePlaceholder")}
              companyId={selectedCompanyId}
            />
          </div>

          {/* Invoice number */}
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">{t("fields.invoiceNumber")}</Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder={t("fields.invoiceNumberPlaceholder")}
            />
          </div>

          {/* Value + Deduction */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valueCents">{t("fields.valueCents")}</Label>
              <Input
                id="valueCents"
                value={valueDisplay}
                inputMode="numeric"
                placeholder="R$ 0,00"
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const cents = parseInt(digits || "0", 10);
                  setValueCents(cents);
                  setValueDisplay(cents > 0 ? getDisplayValue(cents) : "");
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materialCents">{t("fields.deductionCents")}</Label>
              <Input
                id="materialCents"
                value={materialDisplay}
                inputMode="numeric"
                placeholder="R$ 0,00"
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const cents = parseInt(digits || "0", 10);
                  setMaterialCents(cents);
                  setMaterialDisplay(cents > 0 ? getDisplayValue(cents) : "");
                }}
              />
            </div>
          </div>

          {/* Tax overrides */}
          <div className="grid grid-cols-3 gap-3">
            {/* ISSQN override */}
            <div className="space-y-2">
              <Label>ISSQN</Label>
              {supplier?.taxRegime === "sn" ? (
                <Input
                  value={issqnOverrideDisplay}
                  inputMode="decimal"
                  placeholder={formatPercent(taxRates.issqn)}
                  className={
                    issqnOverrideDisplay !== "" && issqnOverride === null
                      ? "border-destructive text-destructive"
                      : "border-foreground/25 text-foreground"
                  }
                  onFocus={() => {
                    setIssqnFocused(true);
                    setIssqnOverrideDisplay((v) => v.replace("%", "").trim());
                  }}
                  onBlur={() => {
                    setIssqnFocused(false);
                    const raw = issqnOverrideDisplay.replace("%", "").trim();
                    const n = parseFloat(raw.replace(",", "."));
                    if (!isNaN(n)) {
                      setIssqnOverrideDisplay(`${n.toFixed(2).replace(".", ",")}%`);
                    }
                  }}
                  onChange={(e) => {
                    const v = e.target.value;
                    setIssqnOverrideDisplay(issqnFocused ? v.replace("%", "") : v);
                  }}
                />
              ) : (
                <div className="flex h-9 items-center rounded-md border border-border/30 bg-muted px-3 text-sm text-muted-foreground/60">
                  {formatPercent(taxRates.issqn)}
                </div>
              )}
            </div>

            {/* INSS override */}
            <div className="space-y-2">
              <Label>INSS</Label>
              {supplier?.taxRegime === "n" || supplier?.taxRegime === "sn" ? (
                <select
                  value={inssOverrideDisplay}
                  onChange={(e) => setInssOverrideDisplay(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-foreground/25 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">{formatPercent(taxRates.inss)}</option>
                  <option value="3.5">3,5%</option>
                  <option value="11">11%</option>
                </select>
              ) : (
                <div className="flex h-9 items-center rounded-md border border-border/30 bg-muted px-3 text-sm text-muted-foreground/60">
                  {formatPercent(taxRates.inss)}
                </div>
              )}
            </div>

            {/* IRRF override */}
            <div className="space-y-2">
              <Label>IRRF</Label>
              {supplier?.taxRegime === "n" ? (
                <select
                  value={irrfOverrideDisplay}
                  onChange={(e) => setIrrfOverrideDisplay(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-foreground/25 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">{formatPercent(taxRates.irrf)}</option>
                  <option value="1">1%</option>
                  <option value="1.5">1,50%</option>
                </select>
              ) : (
                <div className="flex h-9 items-center rounded-md border border-border/30 bg-muted px-3 text-sm text-muted-foreground/60">
                  {formatPercent(taxRates.irrf)}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <LoadingButton
            type="button"
            onClick={handleSubmit}
            loading={isSaving}
            loadingText={t("saving")}
            disabled={
              !supplierCnpj ||
              !serviceCode ||
              !valueCents ||
              !invoiceNumber ||
              !isValidDate(entryDate) ||
              !isValidDate(issueDate) ||
              (issueDate.length === 10 &&
                entryDate.length === 10 &&
                isValidDate(issueDate) &&
                isValidDate(entryDate) &&
                fromDisplayDate(issueDate) > fromDisplayDate(entryDate)) ||
              (!!dueDate && !isValidDate(dueDate))
            }
            className="w-full font-bold uppercase tracking-wide"
            size="lg"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {t("registerInvoice")}
          </LoadingButton>
        </CardFooter>
      </Card>

      {/* ── CARD 2: Resumo e Tributação ────────────────────────────────── */}
      <Card className="flex flex-col bg-muted/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-gap-sm">
            <Calculator className="w-5 h-5" />
            {t("card.taxes")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 flex-1">
          {/* Supplier info block */}
          <div className="space-y-3 bg-background p-4 rounded-lg border">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">{t("card.supplierName")}</span>
              <span className="font-semibold text-right">{supplier?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">{t("card.supplierCity")}</span>
              <span className="font-semibold text-right">{supplier?.city ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">{t("card.taxRegime")}</span>
              <span className="font-semibold text-right">
                {supplier ? regimeLabel[supplier.taxRegime] : "—"}
              </span>
            </div>
          </div>

          {/* Tax table */}
          <div>
            <div className="grid grid-cols-3 text-xs font-bold text-muted-foreground border-b pb-2 mb-1 px-1">
              <span>IMPOSTO</span>
              <span className="text-right">VALOR (R$)</span>
              <span className="text-right">%</span>
            </div>
            {(
              [
                { label: "ISSQN", amount: taxes.issqnAmount, rate: taxes.issqnRate },
                { label: "INSS", amount: taxes.inssAmount, rate: taxes.inssRate },
                { label: "CS", amount: taxes.csAmount, rate: taxes.csRate },
                { label: "IRRF", amount: taxes.irrfAmount, rate: taxes.irrfRate },
              ] as const
            ).map(({ label, amount, rate }) => (
              <div
                key={label}
                className="grid grid-cols-3 text-sm py-1.5 px-1 border-b border-border/50 last:border-0"
              >
                <span className="font-medium">{label}</span>
                <span className="text-right">{amount > 0 ? formatToReais(amount) : "—"}</span>
                <span className="text-right text-muted-foreground">{formatPercent(rate)}</span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full flex items-center justify-between p-4 rounded-lg bg-primary text-primary-foreground">
            <span className="font-bold uppercase tracking-wider text-sm">
              {t("card.netAmount")}
            </span>
            <span className="text-xl font-bold">
              {valueCents > 0 ? formatToReais(taxes.netAmountCents) : "R$ 0,00"}
            </span>
          </div>
        </CardFooter>
      </Card>

      {/* ── CARD 3: Descrição dos Serviços ─────────────────────────────── */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-gap-sm">
            <Receipt className="w-5 h-5" />
            {t("card.serviceDescription")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <Textarea
            className="flex-1 min-h-[300px] resize-none"
            placeholder="—"
            value={service?.description ?? service?.obs ?? ""}
            readOnly
          />
        </CardContent>
      </Card>
    </div>
  );
}
