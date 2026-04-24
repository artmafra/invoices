"use client";

import { useMemo, useRef, useState } from "react";
import { useSelectedCompany } from "@/contexts/company-context";
import type { TaxRates } from "@/schema/services.schema";
import { useTranslations } from "next-intl";
import { extractCnpjDigits } from "@/lib/cnpj-service-code";
import { formatToReais, getDisplayValue } from "@/lib/currency-formatting";
import { useServices } from "@/hooks/admin/use-services";
import { useSuppliers } from "@/hooks/admin/use-suppliers";
import { useDebounce } from "@/hooks/use-debounce";
import { ResultCell, SpreadsheetCell, TaxColumnHeader } from "@/components/admin/report-components";
import { CnpjSelect } from "@/components/shared/cnpj-select";
import { LoadingButton } from "@/components/shared/loading-button";
import { ServiceSelect } from "@/components/shared/service-select";
import { Input } from "@/components/ui/input";

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

const today = toDisplayDate(new Date());

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
    dueDate: Date;
    valueCents: number;
    invoiceNumber: string;
    materialDeductionCents: number;
    inssPercent?: number;
    status: "issued";
  }) => Promise<void>;
  isSaving: boolean;
}

export function InvoiceEntryCard({ onSubmit, isSaving }: InvoiceEntryCardProps) {
  const t = useTranslations("apps/invoices");
  const { selectedCompanyId } = useSelectedCompany();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [entryDate, setEntryDate] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [supplierCnpj, setSupplierCnpj] = useState("");
  const [serviceCode, setServiceCode] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [valueCents, setValueCents] = useState(0);
  const [valueDisplay, setValueDisplay] = useState("");
  const [materialCents, setMaterialCents] = useState(0);
  const [materialDisplay, setMaterialDisplay] = useState("");
  const [inssOverrideDisplay, setInssOverrideDisplay] = useState("");
  const [irrfOverrideDisplay, setIrrfOverrideDisplay] = useState("");
  const [issqnOverrideDisplay, setIssqnOverrideDisplay] = useState("");
  const [issqnFocused, setIssqnFocused] = useState(false);

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
        dueDate: fromDisplayDate(dueDate),
        valueCents,
        invoiceNumber,
        materialDeductionCents: materialCents,
        inssPercent: inssOverride !== null ? inssOverride : undefined,
        status: "issued",
      });

      // Reset form
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

  const dateInputClass =
    "w-full border-0 bg-transparent text-sm p-0 focus:outline-none focus:ring-0 h-auto";

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] border border-border rounded-md overflow-hidden min-w-[900px]">
        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div className="border-r border-border">
          <table className="w-full border-collapse">
            <tbody>
              {/* Dates */}
              <SpreadsheetCell label={t("fields.entryDate")}>
                <input
                  value={entryDate}
                  onChange={(e) => {
                    const next = e.target.value;
                    setEntryDate(next.length >= entryDate.length ? formatDateInput(next) : next);
                  }}
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  className={dateInputClass}
                />
              </SpreadsheetCell>

              <SpreadsheetCell label={t("fields.issueDate")}>
                <input
                  value={issueDate}
                  onChange={(e) => {
                    const next = e.target.value;
                    setIssueDate(next.length >= issueDate.length ? formatDateInput(next) : next);
                  }}
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  className={dateInputClass}
                />
              </SpreadsheetCell>

              <SpreadsheetCell label={t("fields.dueDate")}>
                <input
                  value={dueDate}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDueDate(next.length >= dueDate.length ? formatDateInput(next) : next);
                  }}
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  className={dateInputClass}
                />
              </SpreadsheetCell>

              {/* CNPJ */}
              <SpreadsheetCell label={t("fields.supplierCnpj")}>
                <CnpjSelect
                  value={supplierCnpj || null}
                  onChange={(v) => setSupplierCnpj(v ?? "")}
                  placeholder={t("fields.supplierCnpjPlaceholder")}
                  companyId={selectedCompanyId}
                />
              </SpreadsheetCell>

              {/* Service */}
              <SpreadsheetCell label={t("fields.serviceCode")}>
                <ServiceSelect
                  value={serviceCode}
                  onChange={(v) => setServiceCode(v)}
                  placeholder={t("fields.serviceCodePlaceholder")}
                  companyId={selectedCompanyId}
                />
              </SpreadsheetCell>

              {/* Invoice number */}
              <SpreadsheetCell label={t("fields.invoiceNumber")}>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder={t("fields.invoiceNumberPlaceholder")}
                  className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-sm"
                />
              </SpreadsheetCell>

              {/* Value */}
              <SpreadsheetCell label={t("fields.valueCents")}>
                <Input
                  value={valueDisplay}
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-sm text-right w-full"
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    const cents = parseInt(digits || "0", 10);
                    setValueCents(cents);
                    setValueDisplay(cents > 0 ? getDisplayValue(cents) : "");
                  }}
                />
              </SpreadsheetCell>

              {/* Deduction section */}
              <SpreadsheetCell label={t("fields.deductionCents")}>
                <Input
                  value={materialDisplay}
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-sm text-right w-full"
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    const cents = parseInt(digits || "0", 10);
                    setMaterialCents(cents);
                    setMaterialDisplay(cents > 0 ? getDisplayValue(cents) : "");
                  }}
                />
              </SpreadsheetCell>

              <SpreadsheetCell label="ISSQN">
                {supplier?.taxRegime === "sn" ? (
                  <Input
                    value={issqnOverrideDisplay}
                    inputMode="decimal"
                    placeholder={formatPercent(taxRates.issqn)}
                    className={`border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-sm text-right w-full ${
                      issqnOverrideDisplay !== "" && issqnOverride === null
                        ? "text-destructive"
                        : ""
                    }`}
                    onFocus={() => {
                      setIssqnFocused(true);
                      // strip % suffix so user edits the raw number
                      setIssqnOverrideDisplay((v) => v.replace("%", "").trim());
                    }}
                    onBlur={() => {
                      setIssqnFocused(false);
                      // append % if there's a valid number
                      const raw = issqnOverrideDisplay.replace("%", "").trim();
                      const n = parseFloat(raw.replace(",", "."));
                      if (!isNaN(n)) {
                        setIssqnOverrideDisplay(`${n.toFixed(2).replace(".", ",")}%`);
                      }
                    }}
                    onChange={(e) => {
                      const v = e.target.value;
                      // while focused, allow free input but keep % stripped
                      setIssqnOverrideDisplay(issqnFocused ? v.replace("%", "") : v);
                    }}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground block text-right">
                    {formatPercent(taxRates.issqn)}
                  </span>
                )}
              </SpreadsheetCell>

              <SpreadsheetCell label="INSS">
                {supplier?.taxRegime === "n" || supplier?.taxRegime === "sn" ? (
                  <select
                    value={inssOverrideDisplay}
                    onChange={(e) => setInssOverrideDisplay(e.target.value)}
                    className="w-full border-0 bg-transparent text-sm text-right p-0 focus:outline-none cursor-pointer"
                  >
                    <option value="">{formatPercent(taxRates.inss)}</option>
                    <option value="3">3%</option>
                    <option value="5">5%</option>
                    <option value="11">11%</option>
                  </select>
                ) : (
                  <Input
                    value={inssOverrideDisplay}
                    inputMode="decimal"
                    placeholder={formatPercent(taxRates.inss)}
                    className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 text-sm text-right w-full"
                    onChange={(e) => setInssOverrideDisplay(e.target.value)}
                  />
                )}
              </SpreadsheetCell>

              <SpreadsheetCell label="IRRF">
                {supplier?.taxRegime === "n" ? (
                  <select
                    value={irrfOverrideDisplay}
                    onChange={(e) => setIrrfOverrideDisplay(e.target.value)}
                    className="w-full border-0 bg-transparent text-sm text-right p-0 focus:outline-none cursor-pointer"
                  >
                    <option value="">{formatPercent(taxRates.irrf)}</option>
                    <option value="1">1%</option>
                    <option value="1.5">1,50%</option>
                  </select>
                ) : (
                  <span className="text-sm text-muted-foreground block text-right">
                    {formatPercent(taxRates.irrf)}
                  </span>
                )}
              </SpreadsheetCell>
              <tr>
                <td colSpan={2} className="px-3 py-2 bg-background border-t border-border">
                  <LoadingButton
                    type="button"
                    onClick={handleSubmit}
                    loading={isSaving}
                    loadingText={t("saving")}
                    disabled={!supplierCnpj || !serviceCode || !valueCents || !invoiceNumber}
                    className="w-full rounded-none font-bold uppercase tracking-wide"
                  >
                    {t("registerInvoice")}
                  </LoadingButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── MIDDLE PANEL ───────────────────────────────────────────────── */}
        <div className="border-r border-border flex flex-col">
          <table className="w-full border-collapse">
            <tbody>
              {/* Supplier info */}
              <ResultCell label={t("card.supplierName")} value={supplier?.name ?? "—"} spanValue />
              <ResultCell label={t("card.supplierCity")} value={supplier?.city ?? "—"} spanValue />
              <ResultCell
                label={t("card.taxRegime")}
                value={supplier ? regimeLabel[supplier.taxRegime] : "—"}
                spanValue
              />

              {/* Tax header */}
              <TaxColumnHeader />

              {/* Tax rows */}
              <ResultCell
                label="ISSQN"
                value={taxes.issqnAmount > 0 ? formatToReais(taxes.issqnAmount) : "—"}
                extra={formatPercent(taxes.issqnRate)}
                numeric
              />
              <ResultCell
                label="INSS"
                value={taxes.inssAmount > 0 ? formatToReais(taxes.inssAmount) : "—"}
                extra={taxes.inssRate !== null ? formatPercent(taxes.inssRate) : ""}
                numeric
              />
              <ResultCell
                label="CS"
                value={taxes.csAmount > 0 ? formatToReais(taxes.csAmount) : "—"}
                extra={formatPercent(taxes.csRate)}
                numeric
              />
              <ResultCell
                label="IRRF"
                value={taxes.irrfAmount > 0 ? formatToReais(taxes.irrfAmount) : "—"}
                extra={formatPercent(taxes.irrfRate)}
                numeric
              />
            </tbody>
          </table>

          {/* Net amount pinned to bottom */}
          <div className="mt-auto border-t border-border">
            <table className="w-full border-collapse">
              <tbody>
                <ResultCell
                  label={t("card.netAmount")}
                  value={valueCents > 0 ? formatToReais(taxes.netAmountCents) : "—"}
                  strong
                  highlight
                  spanValue
                  numeric
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <div className="flex flex-col w-100">
          <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide bg-muted border-b border-border">
            {t("card.serviceDescription")}
          </div>
          <div className="p-3 text-sm text-muted-foreground flex-1 bg-background">
            {service?.description ? service.description : service?.obs ? service.obs : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
