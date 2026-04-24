import type { ReactNode } from "react";

export function SpreadsheetCell({
  label,
  children,
  highlight,
}: {
  label: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <tr className="border-b border-border">
      <td
        className={`border-r border-border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${highlight ? "bg-warning/20" : "bg-muted/60"}`}
      >
        {label}
      </td>
      <td className="px-2 py-1 text-sm bg-background">{children}</td>
    </tr>
  );
}

export function ResultCell({
  label,
  value,
  extra,
  strong,
  highlight,
  spanValue,
  numeric,
}: {
  label: string;
  value?: string;
  extra?: string;
  strong?: boolean;
  highlight?: boolean;
  spanValue?: boolean;
  numeric?: boolean;
}) {
  return (
    <tr className="border-b border-border">
      <td
        className={`border-r border-border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${highlight ? "bg-warning/20" : "bg-muted/60"}`}
      >
        {label}
      </td>
      <td
        colSpan={spanValue ? 2 : 1}
        className={`px-3 py-1.5 text-sm ${numeric ? "text-right" : ""} ${spanValue ? "" : "border-r border-border"} ${strong ? "font-bold" : ""} bg-background`}
      >
        {value ?? ""}
      </td>
      {!spanValue && (
        <td
          className={`px-3 py-1.5 text-xs text-muted-foreground ${numeric ? "text-right" : ""} bg-background`}
        >
          {extra ?? ""}
        </td>
      )}
    </tr>
  );
}

export function SectionHeader({ label, colSpan = 2 }: { label: string; colSpan?: number }) {
  return (
    <tr className="border-b border-border">
      <td
        colSpan={colSpan}
        className="px-3 py-1 text-xs font-bold uppercase tracking-wide bg-muted text-foreground"
      >
        {label}
      </td>
    </tr>
  );
}

/** Sub-column headers for a 3-column tax summary table. */
export function TaxColumnHeader({
  col1 = "Imposto",
  col2 = "Valor",
  col3 = "%",
}: {
  col1?: string;
  col2?: string;
  col3?: string;
} = {}) {
  return (
    <tr className="border-b border-border">
      <td className="border-r border-border px-3 py-1 text-xs font-bold uppercase tracking-wide bg-muted">
        {col1}
      </td>
      <td className="border-r border-border px-3 py-1 text-xs font-bold uppercase tracking-wide text-right bg-muted">
        {col2}
      </td>
      <td className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-right bg-muted">
        {col3}
      </td>
    </tr>
  );
}
