import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { GamesPageContent } from "./games-page-content";

export default async function GamesPage() {
  // Server-side permission pre-check (security boundary)
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  if (!hasPermission(session, "games", "view")) {
    redirect("/admin/unauthorized");
  }

  return <GamesPageContent />;
}
