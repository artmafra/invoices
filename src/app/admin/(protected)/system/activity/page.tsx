import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { AdminActivityPageContent } from "./activity-page-content";

export default async function AdminActivityPage() {
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  if (!hasPermission(session, "activity", "view")) {
    redirect("/admin/unauthorized");
  }

  return <AdminActivityPageContent />;
}
