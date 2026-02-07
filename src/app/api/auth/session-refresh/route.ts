import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { userService } from "@/services/runtime/user";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("default", ip);
  if (rateLimitResult) return rateLimitResult;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Get fresh user data from database (includes role name)
  const user = await userService.getUserByIdWithRole(session.user.id);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Return user data that can be used to update the session
  return NextResponse.json({
    name: user.name,
    email: user.email,
    image: user.image,
    roleId: user.roleId,
    roleName: user.roleName,
  });
});
