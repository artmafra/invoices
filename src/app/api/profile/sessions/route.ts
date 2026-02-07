import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { userSessionService } from "@/services/runtime/user-session";
import { getProfileSessionsQuerySchema } from "@/validations/profile-sessions.validations";

/**
 * POST - Track a new login session
 * Called after successful authentication to record session details
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("default", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Get client info from headers
  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

  // Create session record
  const userSession = await userSessionService.createSession({
    userId: session.user.id,
    userAgent,
    ipAddress,
  });

  return NextResponse.json({
    success: { code: "profile.sessions.tracked" },
    sessionId: userSession.id,
    expiresAt: userSession.expiresAt,
  });
});

/**
 * GET - Get current user's active sessions
 *
 * Query params:
 * - search: Search by browser, OS, or location
 * - deviceType: Filter by device type (desktop/mobile/tablet)
 * - sortBy: Sort field (lastActivityAt/createdAt)
 * - sortOrder: Sort direction (asc/desc)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("default", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const { searchParams } = new URL(request.url);

  // Parse and validate query parameters
  const queryResult = getProfileSessionsQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );

  if (!queryResult.success) {
    throw new ValidationError("validation.invalid_query", queryResult.error.flatten());
  }

  const { search, deviceType, sortBy = "lastActivityAt", sortOrder = "desc" } = queryResult.data;

  const response = await userSessionService.getUserSessionsFiltered(
    session.user.id,
    { search, deviceType },
    { sortBy, sortOrder },
  );

  return NextResponse.json(response);
});
