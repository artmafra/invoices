import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { buildQueryParamsSeed, handleConditionalRequest } from "@/lib/http/etag";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { settingsService } from "@/services/runtime/settings";
import { getSettingsQuerySchema } from "@/validations/settings.validations";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("default", ip);
  if (rateLimitResult) return rateLimitResult;

  const { searchParams } = new URL(request.url);

  // Parse and validate query parameters for public access only
  const queryData = {
    key: searchParams.get("key") || undefined,
    category: searchParams.get("category") || undefined,
    scope: "public" as const, // Always public for this endpoint
  };

  const result = getSettingsQuerySchema.safeParse(queryData);
  if (!result.success) {
    throw new ValidationError("Invalid query parameters", result.error.flatten());
  }

  const validatedQuery = result.data;

  // Get specific setting by key - no ETag for single item fetches
  if (validatedQuery.key) {
    const setting = await settingsService.getSetting(validatedQuery.key);

    if (!setting || setting.scope !== "public") {
      throw new NotFoundError("Setting not found");
    }

    return NextResponse.json(setting);
  }

  // Get settings by category or all public settings - with ETag
  const filters = {
    scope: "public" as const,
    category: validatedQuery.category,
  };
  const queryParamsSeed = buildQueryParamsSeed({ category: validatedQuery.category });

  return handleConditionalRequest(
    request,
    async () => {
      const version = await settingsService.getCollectionVersion(filters);
      return `${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}:${queryParamsSeed}`;
    },
    async () => {
      return settingsService.getSettings(filters);
    },
  );
});
