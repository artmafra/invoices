import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { NotesPageContent } from "./notes-page-content";

export default async function NotesPage() {
  // Server-side permission pre-check (security boundary)
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  if (!hasPermission(session, "notes", "view")) {
    redirect("/admin/unauthorized");
  }

  return <NotesPageContent />;
}
