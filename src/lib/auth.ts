/**
 * Authentication module
 *
 * This file re-exports from the modular auth directory for backwards compatibility.
 * The auth system is now split into:
 * - auth/index.ts - Main NextAuth configuration
 * - auth/providers.ts - Authentication providers (Google, credentials, 2FA, passkey)
 * - auth/callbacks.ts - JWT, session, and signIn callbacks
 * - auth/helpers.ts - Utility functions for session management
 * - auth/session-token.ts - Secure token management for session updates
 *
 * @see /docs/ARCHITECTURE.md for details
 */
export {
  handlers,
  auth,
  signIn,
  signOut,
  generateSessionUpdateToken,
  verifyAndConsumeToken,
  getUserPermissionsData,
  getRequestMetadata,
  createSessionForUser,
  type SessionUpdateTokenData,
  type SessionUpdateTokenType,
} from "./auth/index";
