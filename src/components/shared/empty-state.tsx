import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  /** Pre-translated title text */
  title: string;
  /** Optional pre-translated description text */
  description?: string;
  /** Optional Lucide icon component to display above title */
  icon?: LucideIcon;
  /** Optional action button configuration */
  action?: EmptyStateAction;
  /** Whether to show the action button. Default: true if action is provided */
  showAction?: boolean;
  /** Padding size: small (py-4), medium (py-8), large (py-12). Default: large */
  padding?: "small" | "medium" | "large";
  /** Whether to wrap in Card component. Default: true */
  asCard?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  showAction = true,
  padding = "large",
  asCard = true,
  className,
}: EmptyStateProps) {
  const paddingClasses = {
    small: "py-space-lg",
    medium: "py-section",
    large: "py-12",
  };

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-space-md text-center",
        !asCard && paddingClasses[padding],
        className,
      )}
    >
      {Icon && <Icon className="h-12 w-12 text-muted-foreground/50" />}
      <div className="space-y-space-xs">
        <p className="text-muted-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground/75">{description}</p>}
      </div>
      {action && showAction && (
        <Button onClick={action.onClick} variant="default" size="sm" className="mt-space-sm">
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );

  if (!asCard) {
    return content;
  }

  return (
    <Card>
      <CardContent className={paddingClasses[padding]}>{content}</CardContent>
    </Card>
  );
}
