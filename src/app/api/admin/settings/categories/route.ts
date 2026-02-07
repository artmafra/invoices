import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { settingsService } from "@/services/runtime/settings";

// GET - Get distinct setting categories
export const GET = withErrorHandler(async () => {
  const { authorized, error, status } = await requirePermission("settings", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const categories = await settingsService.getDistinctCategories();

  return NextResponse.json(categories.sort());
});
