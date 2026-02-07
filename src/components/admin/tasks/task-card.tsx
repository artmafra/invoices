"use client";

import type { TaskStatus } from "@/schema/tasks.schema";
import { CheckCircle2, Circle, Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChecklistItem } from "@/validations/task.validations";
import type { TaskWithRelations } from "@/hooks/admin/use-tasks";
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
  todo: { variant: "default" as const, Icon: Circle },
  in_progress: { variant: "info" as const, Icon: Clock },
  done: { variant: "success" as const, Icon: CheckCircle2 },
};

const PRIORITY_CONFIG = {
  low: "bg-priority-low text-priority-low-foreground",
  medium: "bg-priority-medium text-priority-medium-foreground",
  high: "bg-priority-high text-priority-high-foreground",
  urgent: "bg-priority-urgent text-priority-urgent-foreground",
} as const;

interface TaskCardProps {
  task: TaskWithRelations;
  canEdit: boolean;
  canDelete: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export function TaskCard({
  task,
  canEdit,
  canDelete,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const t = useTranslations("apps/tasks");
  const tc = useTranslations("common");
  const { formatDate } = useDateFormat();

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <Card>
      <CardContent>
        <div>
          <div className="flex items-center gap-space-lg">
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    {(() => {
                      const StatusIcon =
                        STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG].Icon;
                      return <StatusIcon className="h-4 w-4" />;
                    })()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => onStatusChange(task.id, status as TaskStatus)}
                      className="gap-space-sm"
                    >
                      <config.Icon className="h-4 w-4" />
                      {t(`status.${status}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                {(() => {
                  const StatusIcon = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG].Icon;
                  return <StatusIcon className="h-4 w-4" />;
                })()}
              </div>
            )}

            {/* Task Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-space-sm">
                <CardTitle>{task.title}</CardTitle>
              </div>

              {/* Checklist progress bar */}
              {task.checklistItems && task.checklistItems.length > 0 && (
                <div className="mb-space-xs mt-space-xs">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${
                          (task.checklistItems.filter((item: ChecklistItem) => item.checked)
                            .length /
                            task.checklistItems.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-space-sm truncate text-sm text-muted-foreground">
                {task.assignee && <span>{task.assignee.name || task.assignee.email}</span>}
                {task.dueDate && (
                  <span className={isOverdue ? "text-destructive" : ""}>
                    {t("dueDate", {
                      date: formatDate(task.dueDate),
                    })}
                  </span>
                )}
                {task.status === "done" && task.completedAt && (
                  <span className="text-xs">
                    {t("completedOn", {
                      date: formatDate(task.completedAt),
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="hidden items-center gap-space-sm sm:flex">
              {isOverdue && <Badge variant="destructive">{t("overdue")}</Badge>}
              <Badge className={PRIORITY_CONFIG[task.priority]}>
                {t(`priority.${task.priority}`)}
              </Badge>
              {task.list && <Badge variant="outline">{task.list.name}</Badge>}
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
                    <DropdownMenuItem onClick={() => onEdit(task.id)}>
                      <Pencil className="h-4 w-4" />
                      {tc("buttons.edit")}
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(task.id)}
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

          {/* Mobile badges - shown below on small screens */}
          <div className="mt-space-md flex items-center gap-space-sm sm:hidden">
            {isOverdue && <Badge variant="destructive">{t("overdue")}</Badge>}
            <Badge className={PRIORITY_CONFIG[task.priority]}>
              {t(`priority.${task.priority}`)}
            </Badge>
            {task.list && <Badge variant="outline">{task.list.name}</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
