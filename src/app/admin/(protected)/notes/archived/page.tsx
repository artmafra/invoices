import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ArchivedNotesPageContent } from "./archived-notes-page-content";

export default async function ArchivedNotesPage() {
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  if (!hasPermission(session, "notes", "view")) {
    redirect("/admin/unauthorized");
  }

  return <ArchivedNotesPageContent />;
}
