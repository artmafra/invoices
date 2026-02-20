"use client";

import type { InvoiceStatus } from "@/schema/invoices.schema";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { InvoiceWithRelations } from "@/hooks/admin/use-invoices";
import { useDateFormat } from "@/hooks/use-date-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_CONFIG = {
  Emitida: "bg-priority-medium text-priority-medium-foreground",
  Paga: "bg-success text-success-foreground",
  Cancelada: "bg-destructive text-destructive-foreground",
} as const;

interface InvoiceCardProps {
  invoice: InvoiceWithRelations;
  canEdit: boolean;
  canDelete: boolean;
  onStatusChange: (invoiceId: string, status: InvoiceStatus) => void;
  onEdit: (invoiceId: string) => void;
  onDelete: (invoiceId: string) => void;
}

export function InvoiceCard({
  invoice,
  canEdit,
  canDelete,
  onStatusChange,
  onEdit,
  onDelete,
}: InvoiceCardProps) {
  const t = useTranslations("apps/tasks");
  const tc = useTranslations("common");
  const { formatDate } = useDateFormat();

  const isOverdue =
    invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== "Paga";

  return (
    <Card>
      <CardContent>
        <div>
          <div className="flex items-center gap-space-lg">
            {/* Invoice Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-space-sm">
                <CardTitle>{invoice.invoiceNumber}</CardTitle>
              </div>

              <div className="flex items-center gap-space-sm truncate text-sm text-muted-foreground">
                {invoice.dueDate && (
                  <span className={isOverdue ? "text-destructive" : ""}>
                    {t("dueDate", {
                      date: formatDate(invoice.dueDate),
                    })}
                  </span>
                )}
                {invoice.status === "Paga" && invoice.paidAt && (
                  <span className="text-xs">
                    {t("completedOn", {
                      date: formatDate(invoice.paidAt),
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="hidden items-center gap-space-sm sm:flex">
              {isOverdue && <Badge variant="destructive">{t("overdue")}</Badge>}
              <Badge className={STATUS_CONFIG[invoice.status]}>{`${invoice.status}`}</Badge>
            </div>

            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => onEdit(invoice.id)}>
                      <Pencil className="h-4 w-4" />
                      {"Editar"}
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(invoice.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      {"Excluir"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile badges - shown below on small screens */}
          <div className="mt-space-md flex items-center gap-space-sm sm:hidden">
            {isOverdue && <Badge variant="destructive">{t("overdue")}</Badge>}
            <Badge className={STATUS_CONFIG[invoice.status]}>{`${invoice.status}`}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
