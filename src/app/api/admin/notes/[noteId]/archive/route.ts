import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { noteService } from "@/services/runtime/note";
import { noteIdParamSchema } from "@/validations/note.validations";

/**
 * PATCH /api/admin/notes/[noteId]/archive
 * Toggle archive status of a note
 */
export const PATCH = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ noteId: string }> }) => {
    const { authorized, error, status, session } = await requirePermission("notes", "edit");

    if (!authorized || !session) {
      if (status === 401) throw new UnauthorizedError(error);
      throw new ForbiddenError(error);
    }

    // Validate note ID param
    const resolvedParams = await params;
    const validatedParams = noteIdParamSchema.parse(resolvedParams);

    // Check if note exists
    const existingNote = await noteService.getById(validatedParams.noteId);
    if (!existingNote) {
      throw new NotFoundError("Note", "NOTE_NOT_FOUND");
    }

    // Toggle archive status
    const note = await noteService.toggleArchive(validatedParams.noteId, session.user.id);

    // Log activity
    const _action = note.isArchived ? "notes.archive" : "notes.unarchive";
    await activityService.logUpdate(
      session,
      "notes",
      { type: "note", id: note.id, name: note.title },
      [{ field: "archived", from: !note.isArchived, to: note.isArchived }],
    );

    return NextResponse.json(note);
  },
);
