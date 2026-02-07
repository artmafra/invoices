import { NextRequest, NextResponse } from "next/server";
import { parseBody, withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { withRateLimit } from "@/lib/rate-limit";
import { activityService } from "@/services/runtime/activity";
import { inviteService } from "@/services/runtime/invite";
import { roleService } from "@/services/runtime/role";
import { createInviteSchema } from "@/validations/invite.validations";

// GET - List all pending invitations
export const GET = withErrorHandler(async () => {
  const { authorized, error, status } = await requirePermission("users", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const pendingInvites = await inviteService.getPendingInvites();
  return NextResponse.json(pendingInvites);
});

// POST - Send invitation to a new user
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("users", "create");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  // Rate limit by authenticated user ID to prevent invite spam
  const rateLimitResponse = await withRateLimit("adminInvite", session!.user.id);
  if (rateLimitResponse) return rateLimitResponse;

  const { email, roleId } = await parseBody(request, createInviteSchema);

  // Prevent assigning system role to invited users
  if (roleId) {
    const targetRole = await roleService.getRoleById(roleId);
    if (targetRole?.isSystem) {
      throw new ForbiddenError("Cannot assign system role to users through the UI");
    }
  }

  // Create and send invitation
  await inviteService.createInvite(email, session!.user.id, roleId);

  // Get role name for logging
  const role = roleId ? await roleService.getRoleById(roleId) : null;

  // Log activity - email is the most meaningful identifier for a new invitation
  await activityService.logAction(
    session,
    "invite",
    "users",
    { type: "invitation", name: email },
    {
      metadata: role ? { role: role.name } : undefined,
    },
  );

  return NextResponse.json({ message: "Invitation sent successfully" }, { status: 201 });
});
