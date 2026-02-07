import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ValidationError } from "@/lib/errors";
import { validatePasswordServer } from "@/lib/password-policy.server";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { activityService } from "@/services/runtime/activity";
import { inviteService } from "@/services/runtime/invite";
import { acceptInviteSchema, validateInviteTokenSchema } from "@/validations/invite.validations";

// GET - Validate invitation token
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Rate limit token validation by IP
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("tokenValidation", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  const result = validateInviteTokenSchema.safeParse({ token });
  if (!result.success) {
    return NextResponse.json(
      { valid: false, error: result.error.issues[0].message },
      { status: 400 },
    );
  }

  const validation = await inviteService.validateInvite(result.data.token);

  if (!validation.valid) {
    return NextResponse.json(
      { valid: false, error: "Invalid or expired invitation link" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    valid: true,
    email: validation.email,
    roleName: validation.roleName,
  });
});

// POST - Accept invitation and create account
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("tokenValidation", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json();

  // Validate input
  const result = acceptInviteSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }

  const { token, name, password } = result.data;

  // Validate password against policy
  const passwordValidation = await validatePasswordServer(password);
  if (!passwordValidation.valid) {
    const firstError = passwordValidation.errors[0];
    throw new ValidationError(
      firstError?.key ?? "validation.passwordRequirements",
      firstError?.params,
    );
  }

  // Accept invitation
  const userId = await inviteService.acceptInvite(token, name, password);

  // Log activity
  await activityService.logAction(userId, "invite_accepted", "users", {
    type: "user",
    id: userId,
    name: name,
  });

  return NextResponse.json({
    success: true,
    message: "Account created successfully.",
    userId,
  });
});
