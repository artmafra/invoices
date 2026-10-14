/**
 * Authentication module
 *
 * Re-exports from the modular auth directory. The auth system is split into:
 * - auth/index.ts - Better Auth instance and `auth()` session accessor
 * - auth/sign-in-plugin.ts - Credentials, two-factor and passkey sign-in endpoints
 * - auth/database-hooks.ts - Session enrichment, login history, Google sign-in policy
 * - auth/session-builder.ts - Builds the app session (permissions, impersonation)
 * - auth/helpers.ts - Request metadata and permission loading
 * - auth/session-token.ts - Short-lived tokens for passkey verification
 *
 * @see /docs/AUTH-ARCHITECTURE.md for details
 */
export {
  authServer,
  auth,
  generateSessionUpdateToken,
  verifyAndConsumeToken,
  getUserPermissionsData,
  getRequestMetadata,
  type SessionUpdateTokenData,
  type SessionUpdateTokenType,
} from "./auth/index";
