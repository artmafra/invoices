import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { noteService } from "@/services/runtime/note";
import { noteIdParamSchema, updateNoteSchema } from "@/validations/note.validations";

interface RouteParams {
  params: Promise<{ noteId: string }>;
}

/**
 * GET /api/admin/notes/[noteId]
 * Get a single note by ID
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status } = await requirePermission("notes", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { noteId } = noteIdParamSchema.parse(await params);
  const note = await noteService.getByIdWithCreator(noteId);

  if (!note) {
    throw new NotFoundError("Note not found");
  }

  return NextResponse.json(note);
});

/**
 * PATCH /api/admin/notes/[noteId]
 * Update a note
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("notes", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { noteId } = noteIdParamSchema.parse(await params);
  const existingNote = await noteService.getByIdWithCreator(noteId);

  if (!existingNote) {
    throw new NotFoundError("Note not found");
  }

  const body = await request.json();
  const validation = updateNoteSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  const note = await noteService.update(noteId, {
    ...validation.data,
    updatedById: session.user.id,
  });

  // Build changes array for fields that changed
  const changes = [];
  if (validation.data.title !== undefined && existingNote.title !== note.title) {
    changes.push({ field: "title", from: existingNote.title, to: note.title });
  }
  if (validation.data.content !== undefined && existingNote.content !== note.content) {
    changes.push({ field: "content", from: "(previous content)", to: "(updated content)" });
  }
  if (validation.data.color !== undefined && existingNote.color !== note.color) {
    changes.push({ field: "color", from: existingNote.color, to: note.color });
  }
  if (validation.data.tags !== undefined) {
    const oldTags =
      existingNote.tags
        .map((t) => t.name)
        .sort()
        .join(", ") || "(none)";
    const newTags =
      note.tags
        .map((t) => t.name)
        .sort()
        .join(", ") || "(none)";
    if (oldTags !== newTags) {
      changes.push({ field: "tags", from: oldTags, to: newTags });
    }
  }

  await activityService.logUpdate(
    session,
    "notes",
    { type: "note", id: note.id, name: note.title },
    changes,
  );

  return NextResponse.json(note);
});

/**
 * DELETE /api/admin/notes/[noteId]
 * Delete a note
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("notes", "delete");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { noteId } = noteIdParamSchema.parse(await params);
  const existingNote = await noteService.getById(noteId);

  if (!existingNote) {
    throw new NotFoundError("Note not found");
  }

  await noteService.delete(noteId);

  await activityService.logDelete(session, "notes", {
    type: "note",
    id: noteId,
    name: existingNote.title,
  });

  return NextResponse.json({ success: true });
});
