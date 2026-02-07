import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProfilePageContent } from "./profile-page-content";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  return <ProfilePageContent />;
}
