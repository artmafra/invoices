import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { AdminUsersSettingsPageContent } from "./users-page-content";

export default async function AdminUsersSettingsPage() {
  // Server-side permission pre-check (security boundary)
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  if (!hasPermission(session, "users", "view")) {
    redirect("/admin/unauthorized");
  }

  return <AdminUsersSettingsPageContent />;
}
