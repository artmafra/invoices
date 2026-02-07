import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SecurityPageContent } from "./security-page-content";

export default async function SecurityPage() {
  const session = await auth();

  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login");
  }

  return <SecurityPageContent />;
}
