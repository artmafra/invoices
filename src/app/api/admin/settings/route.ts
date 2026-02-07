import { NextRequest, NextResponse } from "next/server";
import type { SettingScope } from "@/config/settings.registry";
import { isSensitiveSetting } from "@/config/settings.registry";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ForbiddenError,
  fromZodError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { buildQueryParamsSeed, handleConditionalRequest } from "@/lib/http/etag";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { settingsService } from "@/services/runtime/settings";
import { createSettingSchema, getSettingsQuerySchema } from "@/validations/settings.validations";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("settings", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { searchParams } = new URL(request.url);

  // Parse and validate query parameters
  const queryData = {
    key: searchParams.get("key") || undefined,
    category: searchParams.get("category") || undefined,
    scope: (searchParams.get("scope") as SettingScope) || undefined,
    search: searchParams.get("search") || undefined,
  };

  const parseResult = getSettingsQuerySchema.safeParse(queryData);
  if (!parseResult.success) {
    throw fromZodError(parseResult.error);
  }
  const validatedQuery = parseResult.data;

  // Get specific setting by key - no ETag for single item fetches
  if (validatedQuery.key) {
    const setting = await settingsService.getSetting(validatedQuery.key);

    if (!setting) {
      throw new NotFoundError("Setting");
    }

    // Filter out sensitive settings for non-system users
    if (isSensitiveSetting(setting.key) && !session?.user?.isSystemRole) {
      throw new NotFoundError("Setting");
    }

    return NextResponse.json(setting);
  }

  // Build query options
  const queryOptions = {
    search: validatedQuery.search,
    category: validatedQuery.category,
    scope: validatedQuery.scope,
  };
  const isSystemRole = session?.user?.isSystemRole ?? false;
  const queryParamsSeed = buildQueryParamsSeed({ ...queryOptions, isSystemRole });

  return handleConditionalRequest(
    request,
    async () => {
      const version = await settingsService.getCollectionVersion(queryOptions);
      return `${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}:${queryParamsSeed}`;
    },
    async () => {
      // Return all settings matching the filters
      let settings = await settingsService.getSettings(queryOptions);

      // Filter out sensitive settings for non-system users (server-side filtering)
      if (!isSystemRole) {
        settings = settings.filter((setting) => !isSensitiveSetting(setting.key));
      }

      return settings;
    },
  );
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("settings", "edit");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const formData = await request.formData();

  // Parse form data
  const requestData = {
    key: formData.get("key") as string,
    label: formData.get("label") as string,
    type: formData.get("type") as string,
    description: (formData.get("description") as string) || undefined,
    category: (formData.get("category") as string) || "general",
    scope: (formData.get("scope") as SettingScope) || "system",
    value: (formData.get("value") as string) || "",
  };

  // Block non-system users from editing sensitive settings
  if (isSensitiveSetting(requestData.key) && !session?.user?.isSystemRole) {
    throw new ForbiddenError("Insufficient permissions");
  }

  // Pre-validate the type field
  const validTypes = ["string", "boolean", "number", "json", "image", "select"];
  if (!validTypes.includes(requestData.type)) {
    throw new ValidationError(`Invalid type. Must be one of: ${validTypes.join(", ")}`);
  }

  // Validate request data
  const parseResult = createSettingSchema.safeParse(requestData);
  if (!parseResult.success) {
    throw fromZodError(parseResult.error);
  }
  const validatedData = parseResult.data;

  if (validatedData.type === "image") {
    // Get the old value before updating
    const existingSetting = await settingsService.getSetting(validatedData.key);
    const oldValue = existingSetting?.value || null;
    const newValue = validatedData.value || null;

    // Set the image URL (could be empty string if user removed the image)
    await settingsService.setSettingValue(validatedData.key, validatedData.value);

    // Update other properties
    const settingData = {
      key: validatedData.key,
      label: validatedData.label,
      type: validatedData.type,
      description: validatedData.description,
      category: validatedData.category,
      scope: validatedData.scope,
    };

    const updatedSetting = await settingsService.updateSetting(validatedData.key, settingData);

    // Log activity only if the value actually changed
    // (upload-image endpoint logs its own activity, this catches removals and direct URL changes)
    if (oldValue !== newValue) {
      await activityService.logUpdate(
        session,
        "settings",
        { type: "setting", name: validatedData.label },
        [{ field: "value", from: oldValue, to: newValue }],
      );
    }

    return NextResponse.json(updatedSetting);
  }

  // Validate setting value
  if (!settingsService.validateSettingValue(validatedData.type, validatedData.value)) {
    throw new ValidationError(`Invalid value for type ${validatedData.type}`);
  }

  // Get the old value before updating
  const existingSetting = await settingsService.getSetting(validatedData.key);
  const oldValue = existingSetting?.value;

  // Prepare data for database - serialize options array to JSON string
  // Preserve existing options if not provided in the update request
  const dbData = {
    ...validatedData,
    options: validatedData.options
      ? JSON.stringify(validatedData.options)
      : (existingSetting?.options ?? null),
  };

  const setting = await settingsService.upsertSetting(dbData);

  // Log activity
  await activityService.logUpdate(
    session,
    "settings",
    { type: "setting", name: validatedData.label, id: setting.id },
    [{ field: "value", from: oldValue || null, to: validatedData.value || null }],
  );

  return NextResponse.json(setting);
});
