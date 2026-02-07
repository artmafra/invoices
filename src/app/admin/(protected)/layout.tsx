import { redirect } from "next/navigation";
import { SessionContextProvider } from "@/contexts/session-context";
import { getAppsForUser } from "@/lib/apps.server";
import { auth } from "@/lib/auth";
import { getPreferencesFromCookies } from "@/lib/preferences/preferences.server";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { CommandPaletteProvider } from "@/components/admin/command-palette-provider";
import { KeyboardShortcutsProvider } from "@/components/admin/keyboard-shortcuts-provider";
import { LazyCommandPalette } from "@/components/admin/lazy-command-palette";
import { AppsProvider } from "@/components/apps-provider";
import { PreferencesProvider } from "@/components/preferences-provider";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Check for missing session, missing user, or expired session
  if (!session || !session.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  // Get apps filtered by user's apps access
  const apps = getAppsForUser(session.user.apps || []);

  // Read preferences from cookies for SSR injection
  const { paginationSize, selectedApp } = await getPreferencesFromCookies();

  return (
    <SessionContextProvider>
      <PreferencesProvider initialPaginationSize={paginationSize}>
        <AppsProvider apps={apps} initialSelectedAppSlug={selectedApp}>
          <KeyboardShortcutsProvider>
            <CommandPaletteProvider>
              <SidebarProvider
                style={
                  {
                    "--sidebar-width": "calc(var(--spacing) * 65)",
                    "--header-height": "calc(var(--spacing) * 16)",
                  } as React.CSSProperties
                }
              >
                <AppSidebar variant="inset" userPermissions={session.user.permissions || []} />
                {children}
                <LazyCommandPalette />
              </SidebarProvider>
            </CommandPaletteProvider>
          </KeyboardShortcutsProvider>
        </AppsProvider>
      </PreferencesProvider>
    </SessionContextProvider>
  );
}
