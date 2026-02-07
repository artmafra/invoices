import { cn } from "@/lib/utils";

interface PageDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function PageDescription({ children, className, ...props }: PageDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground mb-space-sm", className)} {...props}>
      {children}
    </p>
  );
}
