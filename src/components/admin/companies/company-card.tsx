import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AdminCompanyResponse } from "@/types/companies/companies.types";
import { formatCnpj } from "@/lib/cnpj-service-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CompanyCardProps {
  company: AdminCompanyResponse;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (companyId: string) => void;
  onDelete: (companyId: string) => void;
}

export function CompanyCard({ company, onEdit, onDelete, canEdit, canDelete }: CompanyCardProps) {
  const t = useTranslations("apps/suppliers");
  const tc = useTranslations("common");

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-space-sm">
          {/* Top row: name on left, actions on right */}
          <div className="flex items-start justify-between gap-space-sm">
            <CardTitle className="min-w-0 flex-1">{company.name}</CardTitle>
            <div className="flex shrink-0 items-center gap-space-sm">
              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(company.id)}>
                        <Pencil className="h-4 w-4" />
                        {tc("buttons.edit")}
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(company.id)}
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
          {/* Bottom row: city on left, regime in center, CNPJ on right */}
          <div className="flex items-center gap-space-xl">
            <span className="text-base text-muted-foreground">{company.city}</span>
            <span className="text-base text-muted-foreground">{formatCnpj(company.cnpj)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
