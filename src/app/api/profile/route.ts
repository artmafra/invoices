import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
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
=======
import { z } from "zod/v4";
import type { ActivityChange } from "@/types/common/activity.types";
import type { ProfileUpdateResponse, UserProfileResponse } from "@/types/users/profile.types";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { fromZodError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { handleConditionalRequest } from "@/lib/http/etag";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { accountService } from "@/services/runtime/account";
import { activityService } from "@/services/runtime/activity";
import { passkeyService } from "@/services/runtime/passkey";
import { userService } from "@/services/runtime/user";
import { updateProfileSchema } from "@/validations/profile.validations";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("default", ip);
  if (rateLimitResult) return rateLimitResult;
>>>>>>> relax

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

<<<<<<< HEAD
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
=======
  const userId = session.user.id;

  return handleConditionalRequest(
    request,
    async () => {
      const user = await userService.getUserById(userId);
      return user?.updatedAt?.toISOString() ?? "not-found";
    },
    async () => {
      // Get the full user data from the database with role name
      const user = await userService.getUserByIdWithRole(userId);

      if (!user) {
        throw new NotFoundError("User", "USER_NOT_FOUND");
      }

      // Check if user has password (need to query separately since UserWithRole excludes it)
      const userWithPassword = await userService.getUserById(userId);
      const hasPassword = !!userWithPassword?.password;

      // Check auth capabilities for step-up authentication
      const [hasGoogleLinked, hasPasskeys] = await Promise.all([
        accountService.hasProviderLinked(userId, "google"),
        passkeyService.hasPasskeys(userId),
      ]);

      const response: UserProfileResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        phone: user.phone,
        roleId: user.roleId,
        roleName: user.roleName,
        emailVerified: user.emailVerified?.toISOString() ?? null,
        twoFactorEnabled: user.twoFactorEnabled,
        totpTwoFactorEnabled: user.totpTwoFactorEnabled,
        emailTwoFactorEnabled: user.emailTwoFactorEnabled,
        hasGoogleLinked,
        hasPassword,
        hasPasskeys,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      return response;
    },
  );
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("default", ip);
  if (rateLimitResult) return rateLimitResult;
>>>>>>> relax

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

<<<<<<< HEAD
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
=======
  const body = await request.json();

  let validatedData;
  try {
    validatedData = updateProfileSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  // Get existing user data for comparison
  const existingUser = await userService.getUserById(session.user.id);
  if (!existingUser) {
    throw new NotFoundError("User", "USER_NOT_FOUND");
  }

  // Update user profile - only update fields that were provided
  const updateData: { name?: string; phone?: string | null } = {};
  if (validatedData.name !== undefined) {
    updateData.name = validatedData.name;
  }
  if (validatedData.phone !== undefined) {
    updateData.phone = validatedData.phone || null;
  }

  const updatedUser = await userService.updateUser(session.user.id, updateData);

  if (!updatedUser) {
    throw new Error("Failed to update profile");
  }

  // Build changes array for activity logging (only for provided fields)
  const changes: ActivityChange[] = [];
  if (validatedData.name !== undefined && validatedData.name !== existingUser.name) {
    changes.push({ field: "name", from: existingUser.name, to: validatedData.name || null });
  }
  if (validatedData.phone !== undefined && validatedData.phone !== existingUser.phone) {
    changes.push({ field: "phone", from: existingUser.phone, to: validatedData.phone || null });
  }

  // Log activity only if something changed
  if (changes.length > 0) {
    await activityService.logUpdate(
      session,
      "users",
      {
        type: "user",
        id: session.user.id,
        name: session.user.name || undefined,
      },
      changes,
    );
  }

  const response: ProfileUpdateResponse = {
    success: { code: "profile.updated" },
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      phone: updatedUser.phone,
    },
  };
>>>>>>> relax

  return NextResponse.json(response);
});
