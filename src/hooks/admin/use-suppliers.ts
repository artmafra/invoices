import type { SupplierTaxRegime } from "@/schema/suppliers.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import type { PaginatedResult } from "@/storage/types";
import type { CreateSupplierInput, UpdateSupplierInput } from "@/validations/supplier.validations";
import { SUPPLIERS_QUERY_KEYS as QUERY_KEYS } from "./suppliers.query-keys";

// =============================================================================
// Types
// =============================================================================

export interface Supplier {
  cnpj: string;
  name: string;
  city: string;
  taxRegime: SupplierTaxRegime;
  obs?: string | null;
}

export interface SupplierFilters {
  search?: string;
  cnpj?: string;
  name?: string;
  city?: string;
  taxRegime?: SupplierTaxRegime;
}

// Legacy export for backward compatibility
export const SUPPLIERS_QUERY_KEY = QUERY_KEYS.all;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get paginated suppliers
 */
export const useSuppliers = (
  filters: SupplierFilters = {},
  page: number = 1,
  limit: number = 20,
) => {
  const t = useTranslations("apps/suppliers");

  return useQuery({
    queryKey: QUERY_KEYS.list(filters, page, limit),
    queryFn: async (): Promise<Supplier[]> => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      if (filters.search) params.set("search", filters.search);
      if (filters.city) params.set("city", filters.city);
      if (filters.taxRegime) params.set("taxRegime", filters.taxRegime);

      const response = await fetch(`/api/admin/suppliers?${params.toString()}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchFailed"));
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get a single supplier by CNPJ
 */
export const useSupplier = (cnpj: string) => {
  const t = useTranslations("apps/suppliers");

  return useQuery({
    queryKey: QUERY_KEYS.detail(cnpj),
    queryFn: async (): Promise<Supplier> => {
      const response = await fetch(`/api/admin/suppliers/${cnpj}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchOneFailed"));
      }

      return response.json();
    },
    enabled: !!cnpj,
    staleTime: 30 * 1000,
  });
};

/**
 * Create a new supplier
 */
export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/suppliers");

  return useMutation({
    mutationFn: async (data: CreateSupplierInput): Promise<Supplier> => {
      const response = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("hooks.createFailed"));
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success(t("success.created"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.createFailed") });
    },
  });
};

/**
 * Update a supplier
 */
export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/suppliers");

  return useMutation({
    mutationFn: async ({
      cnpj,
      data,
    }: {
      cnpj: string;
      data: UpdateSupplierInput;
    }): Promise<Supplier> => {
      const response = await fetch(`/api/admin/suppliers/${cnpj}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("hooks.updateFailed"));
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.cnpj) });
      toast.success(t("success.updated"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.updateFailed") });
    },
  });
};

/**
 * Delete a supplier
 */
export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/suppliers");

  return useMutation({
    mutationFn: async (cnpj: string): Promise<void> => {
      const response = await fetch(`/api/admin/suppliers/${cnpj}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw apiErrorFromResponseBody(result, t("hooks.deleteFailed"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success(t("success.deleted"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.deleteFailed") });
    },
  });
};
