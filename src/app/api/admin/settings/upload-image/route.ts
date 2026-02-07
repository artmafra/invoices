import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { generateUUID } from "@/lib/uuid";
import { activityService } from "@/services/runtime/activity";
import { cloudStorageService } from "@/services/runtime/cloud-storage";
import { settingsService } from "@/services/runtime/settings";
import { uploadImageSchema } from "@/validations/settings.validations";

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Check for settings.edit permission
  const { authorized, error, status, session } = await requirePermission("settings", "edit");
  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const settingId = formData.get("settingId") as string;
  const settingKey = formData.get("settingKey") as string;

  // Validate request data
  let validatedData;
  try {
    validatedData = uploadImageSchema.parse({ file, settingId, settingKey });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      throw new ValidationError("Invalid request data");
    }
    throw err;
  }

  // Validate file type
  if (!validatedData.file.type.startsWith("image/")) {
    throw new ValidationError("Only image files are allowed");
  }

  if (validatedData.file.type === "image/svg+xml") {
    throw new ValidationError("SVG images are not allowed");
  }

  // Validate file size (5MB limit)
  if (validatedData.file.size > 5 * 1024 * 1024) {
    throw new ValidationError("File size must be less than 5MB");
  }

  // Get the old value BEFORE uploading/saving (for activity logging)
  const existingSetting = await settingsService.getSetting(validatedData.settingKey);
  const oldValue = existingSetting?.value || null;

  // Generate unique filename with UUID
  const settingUuid = generateUUID();
  const fileName = settingUuid;

  // Convert file to buffer
  const buffer = Buffer.from(await validatedData.file.arrayBuffer());

  // Upload to Google Cloud Storage with the settings folder structure
  const uploadResult = await cloudStorageService.uploadImage(buffer, fileName, `images/settings`);

  // Save the URL to the setting in the database
  await settingsService.setSettingValue(validatedData.settingKey, uploadResult.url);

  // Log activity with correct old/new values
  await activityService.logUpdate(
    session,
    "settings",
    { type: "setting", name: existingSetting?.label || validatedData.settingKey },
    [{ field: "value", from: oldValue, to: uploadResult.url }],
  );

  return NextResponse.json({
    url: uploadResult.url,
    fileName: uploadResult.fileName,
    originalName: uploadResult.originalName,
  });
});
