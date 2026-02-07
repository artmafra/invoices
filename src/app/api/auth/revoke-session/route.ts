import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { userSessionService } from "@/services/runtime/user-session";

// POST /api/auth/revoke-session - Revoke the current DB-backed session row
export const POST = withErrorHandler(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const sessionId = session.sessionId;

  // Idempotent: if sessionId is missing (or already revoked), still return success.
  if (sessionId) {
    try {
      await userSessionService.revokeSession(sessionId, "User signed out");
    } catch (error) {
      // If the session row is already gone/revoked, treat as success.
      console.error("Failed to revoke session on sign-out:", error);
    }
  }

  return NextResponse.json({ success: true });
});
