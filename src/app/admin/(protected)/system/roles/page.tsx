import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { AdminRolesSettingsPageContent } from "./roles-page-content";

export default async function AdminRolesSettingsPage() {
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  if (!hasPermission(session, "roles", "view")) {
    redirect("/admin/unauthorized");
  }

  return <AdminRolesSettingsPageContent />;
}
