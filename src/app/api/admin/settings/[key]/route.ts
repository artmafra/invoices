import { NextRequest, NextResponse } from "next/server";
import { isSensitiveSetting } from "@/config/settings.registry";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ForbiddenError,
  fromZodError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { settingsService } from "@/services/runtime/settings";
import { deleteSettingSchema } from "@/validations/settings.validations";

type RouteParams = {
  params: Promise<{ key: string }>;
};

/**
 * DELETE - Delete a setting by key
 */
export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("settings", "edit");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { key } = await context.params;

  // Validate request data
  const parseResult = deleteSettingSchema.safeParse({ key });
  if (!parseResult.success) {
    throw fromZodError(parseResult.error);
  }
  const validatedData = parseResult.data;

  // Block non-system users from deleting sensitive settings
  if (isSensitiveSetting(validatedData.key) && !session?.user?.isSystemRole) {
    throw new ForbiddenError("Insufficient permissions");
  }

  const setting = await settingsService.getSetting(validatedData.key);

  if (!setting) {
    throw new NotFoundError("Setting");
  }

  const deleted = await settingsService.deleteSetting(validatedData.key);
  if (!deleted) {
    throw new InternalServerError("Failed to delete setting");
  }

  // Log activity
  await activityService.logDelete(session, "settings", { type: "setting", name: setting.label });

  return NextResponse.json({ success: true });
});
