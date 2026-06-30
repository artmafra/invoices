import type { InvoiceWithRelations } from "@/hooks/admin/use-invoices";
import { computeTaxes } from "@/components/admin/invoices/invoice-card";

// ─── helpers ────────────────────────────────────────────────────────────────

const REGIME_ABBR: Record<string, string> = { sn: "SN", n: "N", mei: "MEI" };

function fmtCnpj(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function fmtBRL(cents: number | null | undefined) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(v: number | null | undefined) {
  if (v == null || v === 0) return "—";
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

// ─── shared data builder ─────────────────────────────────────────────────────

export const EXPORT_HEADERS = [
  "CNPJ",
  "Nome",
  "Cidade",
  "Regime",
  "Cód Serv",
  "Desc Serv",
  "Dt Entrada",
  "Dt Emissão",
  "Dt Venc",
  "Nº NF",
  "Valor NF",
  "Ded Mat",
  "Alíq ISSQN",
  "ISSQN",
  "Alíq INSS",
  "INSS",
  "Alíq CS",
  "CS",
  "Alíq IRRF",
  "IRRF",
  "Líquido",
];

export function buildExportRows(invoices: InvoiceWithRelations[]): string[][] {
  return invoices.map((inv) => {
    const rates = inv.service?.taxRates;
    const { issqn, inss, cs, irrf } = computeTaxes(
      inv.valueCents,
      inv.materialDeductionCents,
      rates,
      {
        issqnPercent: inv.issqnPercent,
        inssPercent: inv.inssPercent,
        csPercent: inv.csPercent,
        irrfPercent: inv.irrfPercent,
      },
    );

    return [
      inv.supplier?.cnpj ? fmtCnpj(inv.supplier.cnpj) : "—",
      inv.supplier?.name ?? "—",
      inv.supplier?.city ?? "—",
      inv.supplier?.taxRegime
        ? (REGIME_ABBR[inv.supplier.taxRegime] ?? inv.supplier.taxRegime)
        : "—",
      inv.service?.code ?? "—",
      inv.service?.description ?? "—",
      fmtDate(inv.entryDate),
      fmtDate(inv.issueDate),
      fmtDate(inv.dueDate),
      inv.invoiceNumber,
      fmtBRL(inv.valueCents),
      inv.materialDeductionCents > 0 ? fmtBRL(inv.materialDeductionCents) : "—",
      fmtPct(inv.issqnPercent ?? rates?.issqn),
      issqn != null ? fmtBRL(issqn) : "—",
      fmtPct(inv.inssPercent ?? rates?.inss),
      inss != null ? fmtBRL(inss) : "—",
      fmtPct(inv.csPercent ?? rates?.cs),
      cs != null ? fmtBRL(cs) : "—",
      fmtPct(inv.irrfPercent ?? rates?.irrf),
      irrf != null ? fmtBRL(irrf) : "—",
      fmtBRL(inv.netAmountCents),
    ];
  });
}

// ─── Totals row builder ─────────────────────────────────────────────────────
// Column indices in EXPORT_HEADERS:
// 10=Valor NF, 13=ISSQN, 15=INSS, 17=CS, 19=IRRF, 20=Líquido
export function buildTotalsRow(invoices: InvoiceWithRelations[]): string[] {
  let totalValue = 0;
  let totalIssqn = 0;
  let totalInss = 0;
  let totalCs = 0;
  let totalIrrf = 0;
  let totalNet = 0;

  for (const inv of invoices) {
    const rates = inv.service?.taxRates;
    const { issqn, inss, cs, irrf } = computeTaxes(
      inv.valueCents,
      inv.materialDeductionCents,
      rates,
      {
        issqnPercent: inv.issqnPercent,
        inssPercent: inv.inssPercent,
        csPercent: inv.csPercent,
        irrfPercent: inv.irrfPercent,
      },
    );
    totalValue += inv.valueCents;
    totalIssqn += issqn ?? 0;
    totalInss += inss ?? 0;
    totalCs += cs ?? 0;
    totalIrrf += irrf ?? 0;
    totalNet += inv.netAmountCents ?? 0;
  }

  const row = new Array<string>(EXPORT_HEADERS.length).fill("");
  row[0] = "TOTAL";
  row[10] = fmtBRL(totalValue);
  row[13] = fmtBRL(totalIssqn);
  row[15] = fmtBRL(totalInss);
  row[17] = fmtBRL(totalCs);
  row[19] = fmtBRL(totalIrrf);
  row[20] = fmtBRL(totalNet);
  return row;
}

// ─── Tax-filter column helpers ──────────────────────────────────────────────

const TAX_COL_INDICES: Record<string, [number, number]> = {
  issqn: [12, 13],
  inss: [14, 15],
  cs: [16, 17],
  irrf: [18, 19],
};

function getTaxFilterOmitCols(taxFilters: string[]): Set<number> {
  if (taxFilters.length === 0) return new Set();
  const activeSet = new Set(taxFilters);
  const omit = new Set<number>();
  for (const [tax, cols] of Object.entries(TAX_COL_INDICES)) {
    if (!activeSet.has(tax)) cols.forEach((c) => omit.add(c));
  }
  return omit;
}

function filterColsByOmit<T>(row: T[], omit: Set<number>): T[] {
  return omit.size === 0 ? row : row.filter((_, i) => !omit.has(i));
}

// ─── Option B: Excel ─────────────────────────────────────────────────────────

export async function exportToExcel(invoices: InvoiceWithRelations[], taxFilters: string[] = []) {
  const { utils, writeFile } = await import("xlsx");

  const taxOmit = getTaxFilterOmitCols(taxFilters);
  const headers = filterColsByOmit(EXPORT_HEADERS, taxOmit);
  const rows = buildExportRows(invoices).map((r) => filterColsByOmit(r, taxOmit));
  const totalsRow = filterColsByOmit(buildTotalsRow(invoices), taxOmit);
  const ws = utils.aoa_to_sheet([headers, ...rows, totalsRow]);

  // Column widths
  ws["!cols"] = EXPORT_HEADERS.map((_, i) => ({ wch: i === 1 ? 30 : i === 5 ? 30 : 14 }));

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Relatório");

  const date = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  writeFile(wb, `relatorio-notas-${date}.xlsx`);
}

// ─── Option C: PDF ───────────────────────────────────────────────────────────

// Columns to omit from the PDF (by index in EXPORT_HEADERS / buildExportRows)
// 5=Desc Serv, 6=Dt Entrada, 8=Dt Venc, 11=Ded Mat, 16=Alíq CS, 18=Alíq IRRF
const PDF_OMIT_COLS = new Set([5, 6, 8, 11, 16, 18]);

const TAX_LABEL: Record<string, string> = {
  issqn: "ISSQN",
  inss: "INSS",
  cs: "CS",
  irrf: "IRRF",
};

export async function exportToPdf(
  invoices: InvoiceWithRelations[],
  companyName?: string | null,
  taxFilters?: string[],
) {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const date = new Date().toLocaleDateString("pt-BR");

  const taxLabel =
    taxFilters && taxFilters.length > 0
      ? taxFilters.map((t) => TAX_LABEL[t] ?? t.toUpperCase()).join(", ")
      : null;

  const titleParts = ["Relatório de Impostos Retidos"];
  if (companyName) titleParts.push(companyName);
  if (taxLabel) titleParts.push(taxLabel);
  titleParts.push(date);

  const titleLine = titleParts.join(" — ");

  doc.setFontSize(12);
  doc.text(titleLine, 14, 12);

  const taxOmit = getTaxFilterOmitCols(taxFilters ?? []);
  const combinedOmit = new Set([...PDF_OMIT_COLS, ...taxOmit]);
  const filterCols = <T>(row: T[]): T[] => filterColsByOmit(row, combinedOmit);

  const pdfHeaders = filterCols(EXPORT_HEADERS);
  const rows = buildExportRows(invoices).map(filterCols);
  const totalsRow = filterCols(buildTotalsRow(invoices));

  autoTable(doc, {
    head: [pdfHeaders],
    body: [...rows, totalsRow],
    startY: 18,
    styles: { fontSize: 8, cellPadding: 1.5, overflow: "ellipsize", fillColor: [255, 255, 255] },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 8, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [215, 215, 215] },
    columnStyles: {
      0: { cellWidth: 22 }, // CNPJ
      1: { cellWidth: 28 }, // Nome
    },
    margin: { top: 15, left: 5, right: 5 },
  });

  const filenameParts = ["relatorio-notas"];
  if (companyName) filenameParts.push(companyName.replace(/\s+/g, "-").toLowerCase());
  if (taxLabel) filenameParts.push(taxLabel.replace(/,\s*/g, "-").toLowerCase());
  filenameParts.push(date.replace(/\//g, "-"));

  doc.save(`${filenameParts.join("_")}.pdf`);
}
