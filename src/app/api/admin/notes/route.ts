import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { buildQueryParamsSeed, handleConditionalRequest } from "@/lib/http/etag";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { noteService } from "@/services/runtime/note";
import { createNoteSchema } from "@/validations/note.validations";

/**
 * GET /api/admin/notes
 * List all notes with pagination
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("notes", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || undefined;
  const isPinned = searchParams.get("isPinned");
  const color = searchParams.get("color") || undefined;
  const isArchived = searchParams.get("isArchived");

  const filters = {
    search,
    isPinned: isPinned === "true" ? true : isPinned === "false" ? false : undefined,
    isArchived: isArchived === "true" ? true : isArchived === "false" ? false : undefined,
    color,
  };
  const queryParamsSeed = buildQueryParamsSeed({ ...filters, page, limit });

  return handleConditionalRequest(
    request,
    async () => {
      const version = await noteService.getCollectionVersion(filters);
      return `${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}:${queryParamsSeed}`;
    },
    async () => {
      return noteService.getPaginated(filters, { page, limit });
    },
  );
});

/**
 * POST /api/admin/notes
 * Create a new note
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("notes", "create");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const body = await request.json();
  const validation = createNoteSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  const note = await noteService.create({
    ...validation.data,
    createdById: session.user.id,
  });

  await activityService.logCreate(
    session,
    "notes",
    { type: "note", id: note.id, name: note.title },
    {
      metadata: {
        title: note.title,
        pinned: note.isPinned,
        color: note.color ?? null,
        tags: validation.data.tags || [],
      },
    },
  );

  return NextResponse.json(note, { status: 201 });
});
