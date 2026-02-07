import { NextRequest, NextResponse } from "next/server";
import { deviceTypeEnum } from "@/types/sessions/sessions.types";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, fromZodError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { userSessionService } from "@/services/runtime/user-session";
import { getAdminSessionsQuerySchema } from "@/validations/profile-sessions.validations";

/**
 * GET - Get all active sessions (admin view)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("sessions", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  // Parse and validate query parameters
  const queryResult = getAdminSessionsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!queryResult.success) {
    throw fromZodError(queryResult.error);
  }

  const query = queryResult.data;

  // Validate deviceType if provided
  let deviceType: string | undefined;
  if (query.deviceType) {
    const parsed = deviceTypeEnum.safeParse(query.deviceType);
    if (!parsed.success) {
      throw new ValidationError("Invalid device type. Must be: desktop, mobile, or tablet");
    }
    deviceType = parsed.data;
  }

  const filters = {
    search: query.search,
    deviceType,
    userId: query.userId,
  };

  const options = {
    page: query.page,
    limit: query.limit,
  };

  const result = await userSessionService.getAllActiveSessions(filters, options);

  return NextResponse.json({
    sessions: result.data.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.userName,
      userEmail: s.userEmail,
      deviceType: s.deviceType,
      browser: s.browser,
      os: s.os,
      ipAddress: s.ipAddress,
      city: s.city,
      country: s.country,
      countryCode: s.countryCode,
      region: s.region,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      expiresAt: s.expiresAt,
    })),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  });
});
