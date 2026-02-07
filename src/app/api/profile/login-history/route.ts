import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { loginHistoryService } from "@/services/runtime/login-history";
import {
  getLoginHistoryQuerySchema,
  getRecentLoginHistoryQuerySchema,
} from "@/validations/login-history.validations";

/**
 * GET - Get current user's login history
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Search by browser, OS, location, or IP
 * - success: Filter by success/failure (true/false)
 * - startDate: Filter from date
 * - endDate: Filter to date
 * - authMethod: Filter by auth method (password/google/passkey)
 * - sortBy: Sort field (createdAt)
 * - sortOrder: Sort direction (asc/desc)
 * - recent: If "true", returns recent entries only (ignores pagination)
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
  const isRecent = searchParams.get("recent") === "true";

  // Handle recent login history request
  if (isRecent) {
    const queryResult = getRecentLoginHistoryQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );

    if (!queryResult.success) {
      throw new ValidationError("validation.invalid_query", queryResult.error.flatten());
    }

    const response = await loginHistoryService.getRecent(session.user.id, queryResult.data.limit);

    return NextResponse.json(response);
  }

  // Handle paginated login history request
  const queryResult = getLoginHistoryQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );

  if (!queryResult.success) {
    throw new ValidationError("validation.invalid_query", queryResult.error.flatten());
  }

  const query = queryResult.data;

  const {
    page = 1,
    limit = 20,
    search,
    success,
    startDate,
    endDate,
    authMethod,
    sortOrder = "desc",
  } = query;

  const response = await loginHistoryService.getHistory(
    session.user.id,
    { success, startDate, endDate, authMethod, search },
    { page, limit, sortOrder },
  );

  return NextResponse.json(response);
});
