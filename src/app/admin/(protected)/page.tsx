<<<<<<< HEAD
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { TasksPageContent } from "./tasks/tasks-page-content";

export default async function TasksPage() {
  // Server-side permission pre-check (security boundary)
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  if (!hasPermission(session, "tasks", "view")) {
    redirect("/admin/unauthorized");
  }

  return <TasksPageContent />;
=======
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
>>>>>>> relax
}
