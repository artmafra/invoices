import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ConflictError, ForbiddenError, fromZodError, UnauthorizedError } from "@/lib/errors";
import { buildQueryParamsSeed, handleConditionalRequest } from "@/lib/http/etag";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { permissionService } from "@/services/runtime/permission";
import { roleService } from "@/services/runtime/role";
import { createRoleSchema, getRolesQuerySchema } from "@/validations/role.validations";

// GET - List all roles
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("roles", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  // Parse and validate query parameters with shared schema
  const queryResult = getRolesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!queryResult.success) {
    throw fromZodError(queryResult.error);
  }

  const query = queryResult.data;
  const assignableOnly = query.assignable ?? false;

  const filters = { search: query.search };

  const options = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const queryParamsSeed = buildQueryParamsSeed({
    assignableOnly,
    search: query.search,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    page: query.page,
    limit: query.limit,
  });

  return handleConditionalRequest(
    request,
    async () => {
      const version = await roleService.getCollectionVersion(filters);
      return `${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}:${queryParamsSeed}`;
    },
    async () => {
      // Get user counts per role (for both paths)
      const userCounts = await roleService.getUserCountsByRole();

      // Assignable-only mode: return all assignable roles in paginated envelope for consistency
      if (assignableOnly) {
        const roles = await roleService.getAssignableRolesWithPermissions();
        const { RoleDTO } = await import("@/dtos/role.dto");
        return RoleDTO.toAssignableRolesPaginatedResponse(roles, userCounts);
      }

      // Paginated response for admin listing (DTO includes userCount)
      return roleService.getRoles(filters, options, userCounts);
    },
  );
});

// POST - Create new role
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("roles", "create");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const body = await request.json();
  const parseResult = createRoleSchema.safeParse(body);
  if (!parseResult.success) {
    throw fromZodError(parseResult.error);
  }
  const validatedData = parseResult.data;

  let role;
  try {
    role = await roleService.createRole(
      {
        displayName: validatedData.displayName,
        description: validatedData.description,
      },
      validatedData.permissionIds,
    );
  } catch (err: unknown) {
    const createError = err as Error;
    if (createError.message?.includes("already exists")) {
      throw new ConflictError(createError.message, "ROLE_EXISTS");
    }
    throw err;
  }

  // Get permission names for logging
  const allPermissions = await permissionService.getAllPermissions();
  const permissionNames = (validatedData.permissionIds || [])
    .map((id) => {
      const perm = allPermissions.find((p) => p.id === id);
      return perm ? `${perm.resource}.${perm.action}` : null;
    })
    .filter(Boolean) as string[];

  // Log activity
  await activityService.logCreate(
    session,
    "roles",
    { type: "role", id: role.id, name: role.displayName },
    {
      metadata: {
        name: role.displayName,
        description: role.description,
        permissions: permissionNames,
      },
    },
  );

  return NextResponse.json({ role }, { status: 201 });
});
