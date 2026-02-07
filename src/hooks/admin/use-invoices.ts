import { type InvoiceStatus } from "@/schema/invoices.schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import type { PaginatedResult } from "@/storage/types";
import {
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
} from "@/validations/invoice.validations";
import { INVOICES_QUERY_KEYS as QUERY_KEYS } from "./invoices.query-keys";

// =============================================================================
// Types
// =============================================================================

export interface Invoice {
  id: string;
  supplierCnpj: string;
  serviceCode: string;
  entryDate: string;
  issueDate: string;
  dueDate: string;
  valueCents: number;
  invoiceNumber: string;
  materialDeductionCents: number;
  netAmountCents: number;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceWithRelations extends Invoice {
  supplier?: {
    cnpj: string;
    name: string;
  };
  service?: {
    code: string;
    name: string;
  };
}

export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus;
  supplierCnpj?: string;
  serviceCode?: string;
  issueDateFrom?: string;
  issueDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  includePaid?: boolean;
}

// Legacy export
export const INVOICES_QUERY_KEY = QUERY_KEYS.all;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get paginated invoices
 */
export const useInvoices = (filters: InvoiceFilters = {}, page: number = 1, limit: number = 20) => {
  const t = useTranslations("apps/invoices");

  return useQuery({
    queryKey: QUERY_KEYS.list(filters, page, limit),
    queryFn: async (): Promise<PaginatedResult<InvoiceWithRelations>> => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.supplierCnpj) params.set("supplierCnpj", filters.supplierCnpj);
      if (filters.serviceCode) params.set("serviceCode", filters.serviceCode);
      if (filters.issueDateFrom) params.set("issueDateFrom", filters.issueDateFrom);
      if (filters.issueDateTo) params.set("issueDateTo", filters.issueDateTo);
      if (filters.dueDateFrom) params.set("dueDateFrom", filters.dueDateFrom);
      if (filters.dueDateTo) params.set("dueDateTo", filters.dueDateTo);
      if (filters.includePaid) params.set("includePaid", "true");
      const response = await fetch(`/api/admin/invoices?${params.toString()}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchFailed"));
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Get single invoice by ID
 */
export const useInvoice = (invoiceId: string) => {
  const t = useTranslations("apps/invoices");

  return useQuery({
    queryKey: QUERY_KEYS.detail(invoiceId),
    queryFn: async (): Promise<InvoiceWithRelations> => {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`);

      if (!response.ok) {
        throw new Error(t("hooks.fetchOneFailed"));
      }

      return response.json();
    },
    enabled: !!invoiceId,
    staleTime: 30 * 1000,
  });
};

/**
 * Create invoice
 */
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/invoices");

  return useMutation({
    mutationFn: async (data: CreateInvoiceInput): Promise<Invoice> => {
      const response = await fetch("/api/admin/invoices", {
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
 * Update invoice
 */
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/invoices");

  return useMutation({
    mutationFn: async ({
      invoiceId,
      data,
    }: {
      invoiceId: string;
      data: UpdateInvoiceInput;
    }): Promise<Invoice> => {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(variables.invoiceId) });
      toast.success(t("success.updated"));
    },
    onError: (error: Error) => {
      handleMutationError(error, { fallback: t("hooks.updateFailed") });
    },
  });
};

/**
 * Delete invoice
 */
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("apps/invoices");

  return useMutation({
    mutationFn: async (invoiceId: string): Promise<void> => {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
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
