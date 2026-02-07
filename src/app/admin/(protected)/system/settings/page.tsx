import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { AdminSettingsPageContent } from "./settings-page-content";

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  if (!hasPermission(session, "settings", "view")) {
    redirect("/admin/unauthorized");
  }

  return <AdminSettingsPageContent />;
}
