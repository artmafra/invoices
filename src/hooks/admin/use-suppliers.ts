import type { SupplierTaxRegime } from "@/schema/suppliers.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import type { CreateSupplierInput, UpdateSupplierInput } from "@/validations/supplier.validations";
import { SUPPLIERS_QUERY_KEYS as QUERY_KEYS } from "./suppliers.query-keys";

// =============================================================================
// Types
// =============================================================================

export interface Supplier {
  id: number;
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

      const response = await fetch(`/api/admin/invoices/suppliers?${params.toString()}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchFailed"));
      }

      const result = await response.json();
      return result.data; // Extract the data array from the paginated response
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get a single supplier by ID
 */
export const useSupplier = (id: number) => {
  const t = useTranslations("apps/suppliers");

  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async (): Promise<Supplier> => {
      const response = await fetch(`/api/admin/invoices/suppliers/${id}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchOneFailed"));
      }

      return response.json();
    },
    enabled: !!id,
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
      const response = await fetch("/api/admin/invoices/suppliers", {
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
      id,
      data,
    }: {
      id: number;
      data: UpdateSupplierInput;
    }): Promise<Supplier> => {
      const response = await fetch(`/api/admin/invoices/suppliers/${id}`, {
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
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.lists() });

      // Snapshot current list data for rollback
      const previousLists = queryClient.getQueriesData<Supplier[]>({
        queryKey: QUERY_KEYS.lists(),
      });

      // Optimistically update all cached supplier lists
      queryClient.setQueriesData<Supplier[]>({ queryKey: QUERY_KEYS.lists() }, (old) => {
        if (!old) return old;
        return old.map((supplier) =>
          supplier.id === id ? { ...supplier, ...data } : supplier,
        );
      });

      return { previousLists };
    },
    onSuccess: () => {
      toast.success(t("success.updated"));
    },
    onError: (error: Error, _variables, context) => {
      // Rollback to previous data on error
      if (context?.previousLists) {
        for (const [queryKey, data] of context.previousLists) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      handleMutationError(error, { fallback: t("hooks.updateFailed") });
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch after mutation to ensure server state is synced
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.id) });
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
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`/api/admin/invoices/suppliers/${id}`, {
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
