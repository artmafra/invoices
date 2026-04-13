import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAMES } from "@/lib/preferences/cookies";

export default async function EmpresaRequiredLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const selectedCompanyId = cookieStore.get(COOKIE_NAMES.selectedCompanyId)?.value;

  if (!selectedCompanyId) {
    redirect("/admin/invoices/companies");
  }

  return <>{children}</>;
}
