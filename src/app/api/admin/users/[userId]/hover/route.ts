import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { handleConditionalRequest } from "@/lib/http/etag";
import { requirePermission } from "@/lib/permissions";
import { userService } from "@/services/runtime/user";
import { userIdParamSchema } from "@/validations/user.validations";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET - Get minimal user data for hover card
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status } = await requirePermission("users", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { userId } = userIdParamSchema.parse(await params);

  return handleConditionalRequest(
    request,
    async () => {
      const user = await userService.getUserByIdWithRole(userId);
      return user?.updatedAt?.toISOString() ?? "not-found";
    },
    async () => {
      const user = await userService.getUserByIdWithRole(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }
      // Return minimal data needed for hover card
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        roleName: user.roleName,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      };
    },
  );
});
