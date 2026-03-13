import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type Service } from "@/hooks/admin/use-services";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ServiceTableProps {
  services: Service[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (serviceId: string) => void;
  onDelete: (serviceId: string) => void;
}

export function ServiceTable({
  services,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: ServiceTableProps) {
  const t = useTranslations("apps/services");
  const tc = useTranslations("common");

  const formatTaxRate = (value: number | null) => {
    if (value === null || value === 0) return "NT";
    return `${value.toFixed(2).replace(".", ",")}%`;
  };

  return (
    <div className="space-y-0 overflow-x-auto">
      {/* Regime headers outside table */}
      <div className="sticky top-0 z-30 flex bg-background min-w-max">
        <div className="flex-none" style={{ width: 200 }}>
          {/* Empty space for code column */}
        </div>
        <div className="flex-none" style={{ width: 280 }}>
          {/* Empty space for description column */}
        </div>
        <div
          className="flex-none border border-b-0 bg-muted/50 px-space-sm py-space-xs text-center text-sm font-medium"
          style={{ width: 225 }}
        >
          SN
        </div>
        <div
          className="flex-none border border-b-0 border-l-0 bg-muted/50 px-space-sm py-space-xs text-center text-sm font-medium"
          style={{ width: 224 }}
        >
          N
        </div>
        <div
          className="flex-none border border-b-0 border-l-0 bg-muted/50 px-space-sm py-space-xs text-center text-sm font-medium"
          style={{ width: 224 }}
        >
          MEI
        </div>
      </div>
      <div className="rounded-md border">
        <Table className="table-fixed min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center border-r" style={{ width: 200 }}>
                {t("table.code")}
              </TableHead>
              <TableHead className="text-center border-r-5" style={{ width: 280 }}>
                {t("table.description")}
              </TableHead>
              {/* SN columns */}
              <TableHead className="text-center border-r border-l" style={{ width: 56 }}>
                ISSQN
              </TableHead>
              <TableHead className="text-center border-r border-l" style={{ width: 56 }}>
                INSS
              </TableHead>
              <TableHead className="text-center border-r border-l" style={{ width: 56 }}>
                CS
              </TableHead>
              <TableHead className="text-center border-r-5" style={{ width: 56 }}>
                IRRF
              </TableHead>
              {/* N columns */}
              <TableHead className="text-center border-r border-l" style={{ width: 56 }}>
                ISSQN
              </TableHead>
              <TableHead className="text-center border-r border-l" style={{ width: 56 }}>
                INSS
              </TableHead>
              <TableHead className="text-center border-r border-l" style={{ width: 56 }}>
                CS
              </TableHead>
              <TableHead className="text-center border-r-5" style={{ width: 56 }}>
                IRRF
              </TableHead>
              {/* MEI columns */}
              <TableHead className="text-center border-r border-l" style={{ width: 56 }}>
                ISSQN
              </TableHead>
              <TableHead className="text-center border-r border-l" style={{ width: 56 }}>
                INSS
              </TableHead>
              <TableHead className="text-center border-r border-l" style={{ width: 56 }}>
                CS
              </TableHead>
              <TableHead className="text-center border-r-5" style={{ width: 56 }}>
                IRRF
              </TableHead>
              <TableHead className="text-center border-r">{t("table.obs")}</TableHead>
              {(canEdit || canDelete) && (
                <TableHead className="text-center">{tc("table.actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service, index) => (
              <TableRow key={service.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                <TableCell className="font-medium border-r align-top break-words">
                  {service.code}
                </TableCell>
                <TableCell className="border-r-5 align-top break-words">
                  {service.description}
                </TableCell>
                {/* SN tax rates */}
                <TableCell
                  className="text-center border-r border-l align-top whitespace-nowrap"
                  style={{ width: 56 }}
                >
                  {formatTaxRate(service.sn.issqn)}
                </TableCell>
                <TableCell
                  className="text-center border-r border-l align-top"
                  style={{ width: 56 }}
                >
                  {formatTaxRate(service.sn.inss)}
                </TableCell>
                <TableCell
                  className="text-center border-r border-l align-top"
                  style={{ width: 56 }}
                >
                  {formatTaxRate(service.sn.cs)}
                </TableCell>
                <TableCell className="text-center border-r-5 align-top" style={{ width: 56 }}>
                  {formatTaxRate(service.sn.irrf)}
                </TableCell>
                {/* N tax rates */}
                <TableCell
                  className="text-center border-r border-l align-top"
                  style={{ width: 56 }}
                >
                  {formatTaxRate(service.n.issqn)}
                </TableCell>
                <TableCell
                  className="text-center border-r border-l align-top"
                  style={{ width: 56 }}
                >
                  {formatTaxRate(service.n.inss)}
                </TableCell>
                <TableCell
                  className="text-center border-r border-l align-top"
                  style={{ width: 56 }}
                >
                  {formatTaxRate(service.n.cs)}
                </TableCell>
                <TableCell className="text-center border-r-5 align-top" style={{ width: 56 }}>
                  {formatTaxRate(service.n.irrf)}
                </TableCell>
                {/* MEI tax rates */}
                <TableCell
                  className="text-center border-r border-l align-top"
                  style={{ width: 56 }}
                >
                  {formatTaxRate(service.mei.issqn)}
                </TableCell>
                <TableCell
                  className="text-center border-r border-l align-top"
                  style={{ width: 56 }}
                >
                  {formatTaxRate(service.mei.inss)}
                </TableCell>
                <TableCell
                  className="text-center border-r border-l align-top"
                  style={{ width: 56 }}
                >
                  {formatTaxRate(service.mei.cs)}
                </TableCell>
                <TableCell className="text-center border-r-5 align-top" style={{ width: 56 }}>
                  {formatTaxRate(service.mei.irrf)}
                </TableCell>
                {/* Obs */}
                <TableCell className="max-w-xs truncate border-r align-top">
                  {service.obs || "-"}
                </TableCell>
                {/* Actions */}
                {(canEdit || canDelete) && (
                  <TableCell className="align-top">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
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
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
