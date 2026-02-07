/**
 * Password Policy API Endpoint
 *
 * Returns public password policy settings for client-side validation.
 * No authentication required since this is needed on public forms.
 */

import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { handleConditionalRequest } from "@/lib/http/etag";
import type { PasswordPolicySettings } from "@/lib/password-policy";
import { settingsService } from "@/services/runtime/settings";

export const GET = withErrorHandler(async (request: NextRequest) => {
  return handleConditionalRequest(
    request,
    async () => {
      // Get version from public settings (password policy settings are public scope)
      const version = await settingsService.getCollectionVersion({ scope: "public" });
      return `password-policy:${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}`;
    },
    async () => {
      const [minLength, requireUppercase, requireLowercase, requireNumber, requireSpecial] =
        await Promise.all([
          settingsService.getSettingValue("password_min_length"),
          settingsService.getSettingValue("password_require_uppercase"),
          settingsService.getSettingValue("password_require_lowercase"),
          settingsService.getSettingValue("password_require_number"),
          settingsService.getSettingValue("password_require_special"),
        ]);

      const policy: PasswordPolicySettings = {
        minLength: minLength ?? 8,
        requireUppercase: requireUppercase ?? true,
        requireLowercase: requireLowercase ?? true,
        requireNumber: requireNumber ?? true,
        requireSpecial: requireSpecial ?? false,
      };

      return policy;
    },
  );
});
