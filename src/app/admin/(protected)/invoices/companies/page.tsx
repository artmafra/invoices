import { companyService } from "@/services/runtime/company";
import { CompaniesPageContent } from "./companies-page-content";

export default async function CompaniesPage() {
  const result = await companyService.getPaginated({}, { page: 1, limit: 100 });
  return <CompaniesPageContent companies={result.data} />;
}
