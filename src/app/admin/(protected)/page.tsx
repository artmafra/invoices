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
}
