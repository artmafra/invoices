"use client";

import { useRouter } from "next/navigation";
import { useSelectedCompany } from "@/contexts/company-context";
import { AdminCompanyResponse } from "@/types/companies/companies.types";

export function CompaniesPageContent({ companies }: { companies: AdminCompanyResponse[] }) {
  const router = useRouter();
  const { setSelectedCompanyId } = useSelectedCompany();

  function handleSelect(id: string) {
    setSelectedCompanyId(id);
    router.push("/admin/invoices");
  }

  return null;
}
