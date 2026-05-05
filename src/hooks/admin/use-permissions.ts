import { useQuery } from "@tanstack/react-query";
import type { PermissionGroup, PermissionResponse } from "@/types/permissions/permission-api.types";
import { apiErrorFromResponseBody } from "@/lib/api-request-error";
import { PERMISSIONS_QUERY_KEYS } from "@/hooks/admin/permissions.query-keys";

// =============================================================================
// Hooks
// =============================================================================

// Get all permissions grouped by resource
export const usePermissions = () => {
  return useQuery({
    queryKey: PERMISSIONS_QUERY_KEYS.all(),
    queryFn: async (): Promise<PermissionGroup[]> => {
      const response = await fetch("/api/admin/permissions");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, "Failed to fetch permissions");
      }

      return result as PermissionGroup[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - permissions don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in memory
  });
};

const RESOURCE_LABELS: Record<string, string> = {
  users: "Usuários",
  roles: "Funções",
  settings: "Configurações",
  sessions: "Sessões",
  system: "Sistema",
  activity: "Atividade",
  invoices: "Notas Fiscais",
  suppliers: "Fornecedores",
  services: "Serviços",
  companies: "Empresas",
};

const ACTION_LABELS: Record<string, string> = {
  view: "visualizar",
  create: "criar",
  edit: "editar",
  delete: "excluir",
  activate: "ativar",
  "app-permissions": "permissões de app",
  revoke: "revogar",
  setup: "configurar",
  backup: "backup",
  verify: "verificar",
};

// Helper to format resource name for display
export function formatResourceName(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource.charAt(0).toUpperCase() + resource.slice(1);
}

// Helper to format action name for display
export function formatActionName(action: string): string {
  return ACTION_LABELS[action] ?? action.charAt(0).toUpperCase() + action.slice(1);
}

// Helper to get permission string
export function getPermissionString(permission: PermissionResponse): string {
  return `${permission.resource}.${permission.action}`;
}
