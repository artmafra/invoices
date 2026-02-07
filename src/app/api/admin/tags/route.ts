import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { tagService } from "@/services/runtime/tag";
import { searchTagsSchema } from "@/validations/tag.validations";

/**
 * GET /api/admin/tags
 * Search tags for autocomplete
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Require notes.create permission to search/create tags
  const { authorized, error, status } = await requirePermission("notes", "create");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  // Validate query params
  const searchParams = request.nextUrl.searchParams;
  const validationResult = searchTagsSchema.safeParse({
    q: searchParams.get("q") || undefined,
    limit: searchParams.get("limit") || undefined,
  });

  if (!validationResult.success) {
    throw new ValidationError("Invalid query parameters", validationResult.error.flatten());
  }

  const { q, limit } = validationResult.data;

  // Search tags
  const tags = await tagService.searchForAutocomplete(q || "", limit);

  return NextResponse.json(tags);
});
