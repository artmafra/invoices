import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard page container with consistent padding, spacing, and container queries.
 * Use this component to wrap page content for consistent layout across admin pages.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div
        className={cn(
          "@container/main flex flex-col pt-[calc(var(--spacing-card)*0.67)] pb-section px-[calc(var(--spacing-card)*0.7)] gap-section transition-[padding,gap] duration-200",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
