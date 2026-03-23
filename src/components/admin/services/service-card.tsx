import { FileText, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PaginationSize } from "@/lib/preferences";
import type { PaginatedResult } from "@/storage/types";
import { type Service } from "@/hooks/admin/use-services";
import { DataPagination } from "@/components/shared/data-pagination";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ServiceTableProps {
  services: Service[];
  servicesData?: PaginatedResult<Service>;
  page: number;
  limit: PaginationSize;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (serviceId: string) => void;
  onDelete: (serviceId: string) => void;
  onPageChange: (page: number) => void;
}

const REGIMES = [
  { key: "sn" as const, label: "Simples Nacional" },
  { key: "n" as const, label: "Normal" },
  { key: "mei" as const, label: "MEI" },
];

const TAX_FIELDS = [
  { key: "issqn" as const, label: "ISSQN" },
  { key: "inss" as const, label: "INSS" },
  { key: "cs" as const, label: "CS" },
  { key: "irrf" as const, label: "IRRF" },
];

export function ServiceCard({
  services,
  servicesData,
  page,
  limit,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  onPageChange,
}: ServiceTableProps) {
  const tc = useTranslations("common");

  const formatTaxRate = (value: number | null) => {
    if (value === null || value === 0) return "NT";
    return `${value.toFixed(2).replace(".", ",")}%`;
  };

  const isNT = (value: number | null) => value === null || value === 0;

  const hasObs = (obs: string | null | undefined) =>
    !!obs && obs.trim() !== "" && obs.trim() !== "-";

  return (
    <>
      <div className="flex flex-col gap-space-lg">
        {services.map((service) => (
          <div
            key={service.id}
            className="flex flex-col gap-space-md rounded-xl border border-border bg-card p-card text-sm"
          >
            {/* Header: code badge + description + actions */}
            <div className="flex items-start justify-between gap-space-sm">
              <div className="flex min-w-0 flex-row flex-wrap items-center gap-space-sm">
                <span className="inline-flex shrink-0 items-center rounded-md bg-muted px-input-x py-input-y font-mono text-xs font-semibold text-foreground ring-1 ring-border">
                  {service.code}
                </span>
                <p className="font-medium leading-snug text-foreground">{service.description}</p>
              </div>
              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(service.id)}>
                        <Pencil className="h-4 w-4" />
                        {tc("buttons.edit")}
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(service.id)}
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

            {/* Tax grid: 3 columns for SN, N, MEI */}
            <div className="grid grid-cols-3 gap-space-sm">
              {REGIMES.map((regime) => (
                <div
                  key={regime.key}
                  className="flex flex-col gap-space-xs rounded-lg border border-border bg-muted/50 p-space-lg"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground text-center">
                    {regime.label}
                  </p>
                  <div className="flex flex-col gap-space-xs">
                    {TAX_FIELDS.map((field) => {
                      const raw = service[regime.key][field.key];
                      const formatted = formatTaxRate(raw);
                      const nt = isNT(raw);
                      return (
                        <div key={field.key} className="flex justify-between gap-space-sm">
                          <span className="text-xs text-muted-foreground">{field.label}</span>
                          <span
                            className={
                              nt
                                ? "text-xs text-muted-foreground/50"
                                : "text-xs font-medium text-foreground"
                            }
                          >
                            {formatted}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Observations — only rendered when present */}
            {hasObs(service.obs) && (
              <div className="flex gap-space-sm rounded-lg border border-border bg-muted/30 px-input-x py-input-y">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">{service.obs}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {servicesData && (
        <DataPagination
          page={page}
          totalPages={servicesData.totalPages}
          total={servicesData.total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
