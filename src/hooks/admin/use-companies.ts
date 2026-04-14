import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import type { PaginatedResult } from "@/storage/types";
import type { CreateCompanyInput, UpdateCompanyInput } from "@/validations/company.validations";
import { COMPANIES_QUERY_KEYS as QUERY_KEYS } from "./companies.query-keys";

export interface Company {
  id: string;
  cnpj: string;
  name: string;
  city: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyFilters {
  search?: string;
  city?: string;
  cnpj?: string;
  name?: string;
}

export const useCompanies = (
  filters: CompanyFilters = {},
  page: number = 1,
  limit: number = 20,
) => {
  return useQuery({
    queryKey: QUERY_KEYS.list(filters, page, limit),
    queryFn: async (): Promise<PaginatedResult<Company>> => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (filters.search) params.set("search", filters.search);
      if (filters.cnpj) params.set("cnpj", filters.cnpj);
      if (filters.name) params.set("name", filters.name);
      if (filters.city) params.set("city", filters.city);

      const response = await fetch(`/api/admin/companies?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch companies");
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useCreateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCompanyInput): Promise<Company> => {
      const response = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw apiErrorFromResponseBody(result, "Failed to create company");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success("Empresa criada com sucesso");
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: "Failed to create company" });
    },
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCompanyInput;
    }): Promise<Company> => {
      const response = await fetch(`/api/admin/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw apiErrorFromResponseBody(result, "Failed to update company");
      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.id) });
      toast.success("Empresa atualizada com sucesso");
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: "Failed to update company" });
    },
  });
};

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/admin/companies/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw apiErrorFromResponseBody(result, "Failed to delete company");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success("Empresa excluída com sucesso");
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        conflict: "Cannot delete company with linked records",
        fallback: "Failed to delete company",
      });
    },
  });
};
