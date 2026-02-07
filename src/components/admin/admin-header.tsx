import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AdminHeaderProps {
  title?: string;
  actions?: React.ReactNode;
}

export function AdminHeader({ title = "Template Dashboard", actions }: AdminHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-space-md border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-space-xs lg:gap-space-md pl-0 md:pl-[calc(var(--spacing-card)*0.5)] px-[calc(var(--spacing-card)*0.7)] transition-[padding,gap] duration-200">
        <SidebarTrigger className="" />
        <Separator orientation="vertical" className="mr-space-md data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-medium">{title}</h1>
        {actions && <div className="ml-auto flex items-center gap-space-md">{actions}</div>}
      </div>
    </header>
  );
}
