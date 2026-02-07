import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE_NAME, locales } from "@/i18n/config";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { fromZodError, UnauthorizedError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { userService } from "@/services/runtime/user";

const updateLocaleSchema = z.object({
  locale: z.enum(locales),
});

/**
 * PATCH /api/profile/locale
 * Sync user's locale preference to database (used for emails) and set locale cookie
 */
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("default", ip);
  if (rateLimitResult) return rateLimitResult;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const body = await request.json();
  const parsed = updateLocaleSchema.safeParse(body);

  if (!parsed.success) {
    throw fromZodError(parsed.error);
  }

  const { locale } = parsed.data;

  // Update user's locale in database (for email translations)
  await userService.updateUser(session.user.id, { locale });

  // Set locale cookie for next-intl (1 year expiry)
  const response = NextResponse.json({ success: true });
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // 1 year
    sameSite: "lax",
  });

  return response;
});
