"use client";

import { useEffect } from "react";
import type { TaskPriority, TaskStatus } from "@/schema/tasks.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { createTaskSchema } from "@/validations/task.validations";
import { useDateFormat } from "@/hooks/use-date-format";
import { ChecklistInput } from "@/components/admin/tasks/checklist-input";
import { LazyCalendar } from "@/components/shared/lazy-calendar";
import { LoadingButton } from "@/components/shared/loading-button";
import { UserSelect } from "@/components/shared/user-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUS_VALUES: TaskStatus[] = ["todo", "in_progress", "done"];
const PRIORITY_VALUES: TaskPriority[] = ["low", "medium", "high", "urgent"];

export type TaskFormValues = z.infer<typeof createTaskSchema>;

export interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<TaskFormValues>;
  onSubmit: (data: TaskFormValues) => void;
  isEditing: boolean;
  isSaving: boolean;
  lists: Array<{ id: string; name: string }>;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isEditing,
  isSaving,
  lists,
}: TaskFormDialogProps) {
  const t = useTranslations("apps/tasks");
  const tc = useTranslations("common");
  const { formatDate } = useDateFormat();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: null,
      listId: null,
      assigneeId: null,
      checklistItems: [],
      ...initialData,
    },
  });

  // Reset form when dialog opens or initialData changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
        listId: null,
        assigneeId: null,
        checklistItems: [],
        ...initialData,
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = (data: TaskFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("newTitle")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[80vh] overflow-y-auto">
          <DialogDescription className="mb-space-lg">
            {isEditing ? t("editDescription") : t("createDescription")}
          </DialogDescription>
          <Form {...form}>
            <form id="task-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-section">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.title")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("fields.titlePlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t("fields.descriptionPlaceholder")}
                        className="min-h-25"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checklistItems"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.checklist")}</FormLabel>
                    <FormControl>
                      <ChecklistInput value={field.value || []} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-space-xl sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.status")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_VALUES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {t(`status.${status}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.priority")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITY_VALUES.map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              <div className="flex items-center gap-space-sm">
                                <div
                                  className={cn(
                                    "size-2 rounded-full",
                                    priority === "low" && "bg-priority-low",
                                    priority === "medium" && "bg-priority-medium",
                                    priority === "high" && "bg-priority-high",
                                    priority === "urgent" && "bg-priority-urgent",
                                  )}
                                />
                                {t(`priority.${priority}`)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-space-xl sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="listId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.list")}</FormLabel>
                      <Select
                        value={field.value || "none"}
                        onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("fields.listPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t("noList")}</SelectItem>
                          {lists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.assignee")}</FormLabel>
                      <FormControl>
                        <UserSelect
                          value={field.value || null}
                          onChange={field.onChange}
                          placeholder={t("fields.assigneePlaceholder")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("fields.dueDate")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-space-md text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              formatDate(new Date(field.value))
                            ) : (
                              <span>{t("fields.dueDatePlaceholder")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <LazyCalendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? date.toISOString() : null)}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {tc("buttons.cancel")}
          </Button>
          <LoadingButton
            type="submit"
            form="task-form"
            loading={isSaving}
            loadingText={isEditing ? tc("buttons.saving") : tc("buttons.creating")}
          >
            {isEditing ? tc("buttons.save") : tc("buttons.create")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
