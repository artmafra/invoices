import type { useTranslations } from "next-intl";
import { SearchBarFilterSelect } from "@/components/shared/search-bar";
import { Button } from "@/components/ui/button";

export interface TasksFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  showOverdueOnly: boolean;
  onOverdueToggle: () => void;
  t: ReturnType<typeof useTranslations<"apps/tasks">>;
}

/**
 * Filter controls for tasks page
 * Extracts filter UI into reusable component
 */
export function TasksFilters({
  statusFilter,
  onStatusFilterChange,
  showOverdueOnly,
  onOverdueToggle,
  t,
}: TasksFiltersProps) {
  return (
    <>
      <SearchBarFilterSelect
        label={t("fields.status")}
        value={statusFilter === "all" ? undefined : statusFilter}
        onValueChange={(v) => onStatusFilterChange(v === undefined ? "all" : v)}
        anyLabel={t("allStatus")}
        options={[
          { value: "todo", label: t("status.todo") },
          { value: "in_progress", label: t("status.in_progress") },
          { value: "done", label: t("status.done") },
        ]}
      />

      <Button
        variant={showOverdueOnly ? "default" : "outline"}
        size="sm"
        onClick={onOverdueToggle}
        className="w-full sm:w-auto"
      >
        {t("overdueOnly")}
      </Button>
    </>
  );
}
