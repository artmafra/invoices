import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { SessionsPageContent } from "./sessions-page-content";

export default async function SessionsPage() {
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  if (!hasPermission(session, "sessions", "view")) {
    redirect("/admin/unauthorized");
  }

  return <SessionsPageContent />;
}
