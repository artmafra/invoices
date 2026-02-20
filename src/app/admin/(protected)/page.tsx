"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelectedApp } from "@/hooks/admin/use-selected-app";
import { SidebarInset } from "@/components/ui/sidebar";

export default function AdminPage() {
  const router = useRouter();
  const { selectedApp, hasAccessibleApps } = useSelectedApp();

  useEffect(() => {
    if (!hasAccessibleApps) {
      router.replace("/admin/unauthorized");
    } else if (selectedApp) {
      router.replace(`/admin/${selectedApp.slug}`);
    }
  }, [hasAccessibleApps, selectedApp, router]);

  // Show minimal loading state while redirecting
  return (
    <SidebarInset>
      <div className="flex flex-1 items-center justify-center" />
    </SidebarInset>
  );
}
