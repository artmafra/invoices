import type { TaxRates } from "@/schema/services.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import type { CreateServiceInput, UpdateServiceInput } from "@/validations/service.validations";
import { SERVICES_QUERY_KEYS as QUERY_KEYS } from "./services.query-keys";

// =============================================================================
// Types
// =============================================================================

export interface Service {
  code: string;
  description: string;
  debit: string;
  sn: TaxRates;
  n: TaxRates;
  mei: TaxRates;
  obs?: string | null;
}

export interface ServiceFilters {
  search?: string;
}

// Legacy export for backward compatibility
export const SERVICES_QUERY_KEY = QUERY_KEYS.all;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get all services
 */
export const useServices = (filters: ServiceFilters = {}) => {
  const t = useTranslations("apps/services");

  return useQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: async (): Promise<Service[]> => {
      const params = new URLSearchParams();

      if (filters.search) params.set("search", filters.search);

      const response = await fetch(`/api/admin/invoices/services?${params.toString()}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchFailed"));
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (services don't change often)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Get a single service by code
 */
export const useService = (code: string) => {
  const t = useTranslations("apps/services");

  return useQuery({
    queryKey: QUERY_KEYS.detail(code),
    queryFn: async (): Promise<Service> => {
      const response = await fetch(`/api/admin/invoices/services/${code}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchOneFailed"));
      }

      return response.json();
    },
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a new service
 */
export const useCreateService = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/services");

  return useMutation({
    mutationFn: async (data: CreateServiceInput): Promise<Service> => {
      const response = await fetch("/api/admin/invoices/services", {
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
 * Update a service
 */
export const useUpdateService = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/services");

  return useMutation({
    mutationFn: async ({
      code,
      data,
    }: {
      code: string;
      data: UpdateServiceInput;
    }): Promise<Service> => {
      const response = await fetch(`/api/admin/invoices/services/${code}`, {
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
    onMutate: async ({ code, data }) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.lists() });

      // Snapshot current list data for rollback
      const previousLists = queryClient.getQueriesData<Service[]>({
        queryKey: QUERY_KEYS.lists(),
      });

      // Optimistically update all cached service lists
      queryClient.setQueriesData<Service[]>({ queryKey: QUERY_KEYS.lists() }, (old) => {
        if (!old) return old;
        return old.map((service) => (service.code === code ? { ...service, ...data } : service));
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.code) });
    },
  });
};

/**
 * Delete a service
 */
export const useDeleteService = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/services");

  return useMutation({
    mutationFn: async (code: string): Promise<void> => {
      const response = await fetch(`/api/admin/invoices/services/${code}`, {
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
