import { NextRequest, NextResponse } from "next/server";
import { UserDTO } from "@/dtos/user.dto";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ConflictError,
  ForbiddenError,
  fromZodError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { buildQueryParamsSeed, handleConditionalRequest } from "@/lib/http/etag";
import { validatePasswordServer } from "@/lib/password-policy.server";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { loginProtectionService } from "@/services/runtime/login-protection";
import { roleService } from "@/services/runtime/role";
import { userService } from "@/services/runtime/user";
import { createUserRequestSchema, getUsersQuerySchema } from "@/validations/user.validations";

// GET - List all users
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("users", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  // Parse and validate query parameters with shared schema
  const queryResult = getUsersQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!queryResult.success) {
    throw fromZodError(queryResult.error);
  }

  const query = queryResult.data;

  const filters = {
    search: query.search,
    roleId: query.roleId,
    isActive: query.active,
    // Don't exclude system users - show them in the list (but they're still protected from edits)
  };

  const options = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy ?? "createdAt",
    sortOrder: query.sortOrder,
  };

  // Build query params seed for ETag (ensures different queries have different ETags)
  const queryParamsSeed = buildQueryParamsSeed({
    search: query.search,
    roleId: query.roleId,
    isActive: query.active,
    sortBy: options.sortBy,
    sortOrder: query.sortOrder,
    page: query.page,
    limit: query.limit,
  });

  return handleConditionalRequest(
    request,
    // Get version seed (cheap query: max(updated_at) + count)
    async () => {
      const version = await userService.getUsersVersion(filters);
      const timestamp = version.maxUpdatedAt?.toISOString() ?? "empty";
      return `${timestamp}:${version.count}:${queryParamsSeed}`;
    },
    // Get full data (only called if ETag doesn't match)
    async () => {
      // Get lock status for all users in bulk
      const allUsers = await userService.getAllUsers(filters);
      const emails = allUsers.map((u) => u.email);
      const lockStatuses = await loginProtectionService.getBulkLockStatus(emails);

      // Service now handles DTO transformation with lock status
      return userService.getUsersPaginated(filters, options, lockStatuses);
    },
  );
});

// POST - Create new user
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("users", "create");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const body = await request.json();
  const validatedData = createUserRequestSchema.parse(body);

  // Check if user already exists
  const existingUser = await userService.getUserByEmail(validatedData.email);
  if (existingUser) {
    throw new ConflictError("User already exists", "USER_EXISTS");
  }

  // Prevent assigning system role to new users
  if (validatedData.roleId) {
    const targetRole = await roleService.getRoleById(validatedData.roleId);
    if (targetRole?.isSystem) {
      throw new ForbiddenError("Cannot assign system role to users through the UI");
    }
  }

  // Validate password against policy
  const passwordValidation = await validatePasswordServer(validatedData.password);
  if (!passwordValidation.valid) {
    const firstError = passwordValidation.errors[0];
    throw new ValidationError(
      firstError?.key ?? "validation.passwordRequirements",
      firstError?.params,
    );
  }

  const userData = {
    email: validatedData.email,
    name: validatedData.name,
    phone: null,
    roleId: validatedData.roleId || null,
    password: validatedData.password,
    isActive: true,
  };

  const newUser = await userService.createUser(userData);

  // Get role name for logging
  const role = newUser.roleId ? await roleService.getRoleById(newUser.roleId) : null;

  // Log activity
  await activityService.logCreate(
    session,
    "users",
    { type: "user", id: newUser.id, name: newUser.name || newUser.email },
    {
      metadata: {
        name: newUser.name,
        email: newUser.email,
        role: role?.name ?? null,
      },
    },
  );

  // Transform to DTO to exclude password hash
  const userWithRole = {
    ...newUser,
    roleName: role?.name ?? null,
    isSystemRole: role?.isSystem ?? false,
  };
  const userResponse = UserDTO.toAdminDetailResponse(userWithRole);

  return NextResponse.json({ user: userResponse }, { status: 201 });
});
