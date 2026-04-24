import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ReportsPageContent } from "./reports-page-content";

export default async function ReportsPage() {
  // Server-side permission pre-check (security boundary)
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  if (!hasPermission(session, "invoices", "view")) {
    redirect("/admin/unauthorized");
  }

  return <ReportsPageContent />;
}
