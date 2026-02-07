import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { noteService } from "@/services/runtime/note";
import { noteIdParamSchema } from "@/validations/note.validations";

interface RouteParams {
  params: Promise<{ noteId: string }>;
}

/**
 * POST /api/admin/notes/[noteId]/toggle-pin
 * Toggle the pin status of a note
 */
export const POST = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("notes", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { noteId } = noteIdParamSchema.parse(await params);
  const existingNote = await noteService.getById(noteId);

  if (!existingNote) {
    throw new NotFoundError("Note not found");
  }

  const note = await noteService.togglePin(noteId, session.user.id);

  await activityService.logAction(session, note.isPinned ? "pin" : "unpin", "notes", {
    type: "note",
    id: note.id,
    name: note.title,
  });

  return NextResponse.json(note);
});
