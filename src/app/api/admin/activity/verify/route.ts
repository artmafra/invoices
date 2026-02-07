import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";

/**
 * Request schema for chain verification
 */
const verifyRequestSchema = z.object({
  mode: z.enum(["quick", "full"]),
  limit: z.number().int().min(10).max(10000).optional(),
});

/**
 * POST /api/admin/activity/verify
 *
 * Verify the integrity of the activity log chain.
 * Requires `activity.verify` permission.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Check permission
  const { authorized, error, status } = await requirePermission("activity", "verify");
  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  // Parse and validate request body
  const body = await request.json();
  const validationResult = verifyRequestSchema.safeParse(body);
  if (!validationResult.success) {
    throw new ValidationError("Invalid request body", validationResult.error.flatten());
  }

  const { mode, limit } = validationResult.data;

  // Perform verification
  const result = await activityService.verifyChain({ mode, limit });

  return NextResponse.json(result);
});
