// =============================================================================
// Mutation Error Handler
// =============================================================================

import { toast } from "sonner";

export class ApiRequestError extends Error {
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(message: string, options?: { code?: string; details?: unknown }) {
    super(message);
    this.name = "ApiRequestError";
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

export function apiErrorFromResponseBody(body: unknown, fallbackMessage: string): ApiRequestError {
  const maybeBody = body as
    | { error?: unknown; code?: unknown; details?: unknown }
    | null
    | undefined;

  const message = typeof maybeBody?.error === "string" ? maybeBody.error : fallbackMessage;
  const code = typeof maybeBody?.code === "string" ? maybeBody.code : undefined;

  return new ApiRequestError(message, { code, details: maybeBody?.details });
}

export type MutationErrorMessages = {
  // Standard HTTP errors
  unauthorized?: string;
  forbidden?: string;
  notFound?: string;
  conflict?: string;
  validation?: string;
  rateLimitExceeded?: string;
  accountLocked?: string;

  // User/account related
  userExists?: string;
  userInactive?: string;

  // Role related
  roleExists?: string;
  roleNameExists?: string;

  // Auth/token related
  invalidResetToken?: string;
  invalidInviteToken?: string;
  invalidVerificationCode?: string;
  invalid2faCode?: string;
  sessionExpired?: string;

  // Email related
  emailAlreadyVerified?: string;
  sameEmail?: string;
  emailAlreadyAdded?: string;
  emailInUse?: string;
  cannotRemovePrimary?: string;
  cannotRemoveOnlyEmail?: string;
  emailNotVerified?: string;
  invalidCode?: string;

  // Google OAuth related
  googleLinkedToOther?: string;
  googleAlreadyLinked?: string;
  googleIdRequired?: string;

  // 2FA related
  email2faAlreadyEnabled?: string;
  codeRequired?: string;
  totpNotEnabled?: string;

  // Passkey related
  passkeyNotFound?: string;
  challengeExpired?: string;
  challengeUserMismatch?: string;
  invalidChallengeType?: string;
  passkeyVerificationFailed?: string;
  passkeyAuthFailed?: string;

  // Image/upload related
  noImageProvided?: string;
  notAnImage?: string;
  svgNotAllowed?: string;
  imageTooLarge?: string;
  unsupportedImageFormat?: string;
  invalidImage?: string;
  invalidImageDimensions?: string;

  // Impersonation related
  cannotImpersonateSelf?: string;
  alreadyImpersonating?: string;
  cannotImpersonateSystem?: string;

  // Generic fallback (required)
  fallback: string;
};

/**
 * Maps error codes to message keys in MutationErrorMessages
 */
const CODE_TO_MESSAGE_KEY: Record<string, keyof MutationErrorMessages> = {
  // Standard errors
  NOT_FOUND: "notFound",
  CONFLICT: "conflict",
  VALIDATION_ERROR: "validation",
  ACCOUNT_LOCKED: "accountLocked",

  // User/account related
  USER_EXISTS: "userExists",
  USER_INACTIVE: "userInactive",

  // Role related
  ROLE_EXISTS: "roleExists",
  ROLE_NAME_EXISTS: "roleNameExists",

  // Auth/token related
  INVALID_RESET_TOKEN: "invalidResetToken",
  INVALID_INVITE_TOKEN: "invalidInviteToken",
  INVALID_VERIFICATION_CODE: "invalidVerificationCode",
  INVALID_2FA_CODE: "invalid2faCode",

  // Email related
  EMAIL_ALREADY_VERIFIED: "emailAlreadyVerified",
  SAME_EMAIL: "sameEmail",
  EMAIL_ALREADY_ADDED: "emailAlreadyAdded",
  EMAIL_IN_USE: "emailInUse",
  CANNOT_REMOVE_PRIMARY: "cannotRemovePrimary",
  CANNOT_REMOVE_ONLY_EMAIL: "cannotRemoveOnlyEmail",
  EMAIL_NOT_VERIFIED: "emailNotVerified",
  INVALID_CODE: "invalidCode",

  // Google OAuth related
  GOOGLE_LINKED_TO_OTHER: "googleLinkedToOther",
  GOOGLE_ALREADY_LINKED: "googleAlreadyLinked",
  GOOGLE_ID_REQUIRED: "googleIdRequired",

  // 2FA related
  EMAIL_2FA_ALREADY_ENABLED: "email2faAlreadyEnabled",
  CODE_REQUIRED: "codeRequired",
  TOTP_NOT_ENABLED: "totpNotEnabled",

  // Passkey related
  PASSKEY_NOT_FOUND: "passkeyNotFound",
  CHALLENGE_EXPIRED: "challengeExpired",
  CHALLENGE_USER_MISMATCH: "challengeUserMismatch",
  INVALID_CHALLENGE_TYPE: "invalidChallengeType",
  PASSKEY_VERIFICATION_FAILED: "passkeyVerificationFailed",
  PASSKEY_AUTH_FAILED: "passkeyAuthFailed",

  // Image/upload related
  NO_IMAGE_PROVIDED: "noImageProvided",
  NOT_AN_IMAGE: "notAnImage",
  SVG_NOT_ALLOWED: "svgNotAllowed",
  IMAGE_TOO_LARGE: "imageTooLarge",
  UNSUPPORTED_IMAGE_FORMAT: "unsupportedImageFormat",
  INVALID_IMAGE: "invalidImage",
  INVALID_IMAGE_DIMENSIONS: "invalidImageDimensions",

  // Impersonation related
  CANNOT_IMPERSONATE_SELF: "cannotImpersonateSelf",
  ALREADY_IMPERSONATING: "alreadyImpersonating",
  CANNOT_IMPERSONATE_SYSTEM: "cannotImpersonateSystem",
};

/**
 * Handles mutation errors consistently by showing appropriate toast messages.
 * Checks for common API errors first, then specific error codes, then falls back
 * to a generic error message (never showing raw server messages to users).
 */
export function handleMutationError(
  error: Error,
  messages: MutationErrorMessages,
  toastId?: string,
) {
  const toastOptions = toastId ? { id: toastId } : undefined;

  if (isApiRequestError(error)) {
    // Handle standard HTTP error codes first
    switch (error.code) {
      case "UNAUTHORIZED":
        toast.error(messages.unauthorized ?? messages.fallback, toastOptions);
        return;
      case "FORBIDDEN":
        toast.error(messages.forbidden ?? messages.fallback, toastOptions);
        return;
      case "RATE_LIMIT_EXCEEDED":
        toast.error(messages.rateLimitExceeded ?? messages.fallback, toastOptions);
        return;
    }

    // Map specific codes to custom messages
    if (error.code) {
      const messageKey = CODE_TO_MESSAGE_KEY[error.code];
      if (messageKey) {
        const customMessage = messages[messageKey];
        if (customMessage) {
          toast.error(customMessage, toastOptions);
          return;
        }
      }
    }

    // Fall back to generic error message (never show raw server messages)
    toast.error(messages.fallback, toastOptions);
    return;
  }

  // For non-API errors, use generic fallback
  toast.error(messages.fallback, toastOptions);
}
