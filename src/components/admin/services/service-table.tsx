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
    if (value === null) return "NT";
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-0">
      {/* Regime headers outside table */}
      <div className="flex">
        <div className="flex-none" style={{ width: "calc(12% + 28%)" }}>
          {/* Empty space for code and description columns */}
        </div>
        <div
          className="flex-none border border-b-0 bg-muted/50 px-space-sm py-space-xs text-center text-sm font-medium"
          style={{ width: "calc(20%)" }}
        >
          SN
        </div>
        <div
          className="flex-none border border-b-0 border-l-0 bg-muted/50 px-space-sm py-space-xs text-center text-sm font-medium"
          style={{ width: "calc(20%)" }}
        >
          N
        </div>
        <div
          className="flex-none border border-b-0 border-l-0 bg-muted/50 px-space-sm py-space-xs text-center text-sm font-medium"
          style={{ width: "calc(20%)" }}
        >
          MEI
        </div>
      </div>
      <div className="rounded-md border border-t-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="align-bottom border-r w-[12%]">{t("table.code")}</TableHead>
              <TableHead className="align-bottom border-r w-[28%]">
                {t("table.description")}
              </TableHead>
              {/* SN columns */}
              <TableHead className="text-center w-[5%]">ISSQN</TableHead>
              <TableHead className="text-center w-[5%]">INSS</TableHead>
              <TableHead className="text-center w-[5%]">CS</TableHead>
              <TableHead className="text-center border-r w-[5%]">IRRF</TableHead>
              {/* N columns */}
              <TableHead className="text-center w-[5%]">ISSQN</TableHead>
              <TableHead className="text-center w-[5%]">INSS</TableHead>
              <TableHead className="text-center w-[5%]">CS</TableHead>
              <TableHead className="text-center border-r w-[5%]">IRRF</TableHead>
              {/* MEI columns */}
              <TableHead className="text-center w-[5%]">ISSQN</TableHead>
              <TableHead className="text-center w-[5%]">INSS</TableHead>
              <TableHead className="text-center w-[5%]">CS</TableHead>
              <TableHead className="text-center border-r w-[5%]">IRRF</TableHead>
              <TableHead className="align-bottom border-r">{t("table.obs")}</TableHead>
              {(canEdit || canDelete) && (
                <TableHead className="align-bottom">{tc("table.actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium border-r">{service.code}</TableCell>
                <TableCell className="border-r">{service.description}</TableCell>
                {/* SN tax rates */}
                <TableCell className="text-center">{formatTaxRate(service.sn.issqn)}</TableCell>
                <TableCell className="text-center">{formatTaxRate(service.sn.inss)}</TableCell>
                <TableCell className="text-center">{formatTaxRate(service.sn.cs)}</TableCell>
                <TableCell className="text-center border-r">
                  {formatTaxRate(service.sn.irrf)}
                </TableCell>
                {/* N tax rates */}
                <TableCell className="text-center">{formatTaxRate(service.n.issqn)}</TableCell>
                <TableCell className="text-center">{formatTaxRate(service.n.inss)}</TableCell>
                <TableCell className="text-center">{formatTaxRate(service.n.cs)}</TableCell>
                <TableCell className="text-center border-r">
                  {formatTaxRate(service.n.irrf)}
                </TableCell>
                {/* MEI tax rates */}
                <TableCell className="text-center">{formatTaxRate(service.mei.issqn)}</TableCell>
                <TableCell className="text-center">{formatTaxRate(service.mei.inss)}</TableCell>
                <TableCell className="text-center">{formatTaxRate(service.mei.cs)}</TableCell>
                <TableCell className="text-center border-r">
                  {formatTaxRate(service.mei.irrf)}
                </TableCell>
                {/* Obs */}
                <TableCell className="max-w-xs truncate border-r">{service.obs || "-"}</TableCell>
                {/* Actions */}
                {(canEdit || canDelete) && (
                  <TableCell>
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
