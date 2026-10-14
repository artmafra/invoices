import { cache } from "react";
import { headers } from "next/headers";
import { accountsTable } from "@/schema/accounts.schema";
import { userSessionsTable } from "@/schema/user-session.schema";
import { usersTable } from "@/schema/users.schema";
import { verificationsTable } from "@/schema/verifications.schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import type { Session } from "@/types/auth/session.types";
import { db } from "@/db/postgres";
import { databaseHooks, validateOAuthUser } from "./database-hooks";
import { buildAppSession } from "./session-builder";
import { appSignIn } from "./sign-in-plugin";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const optionalString = { type: "string", required: false, input: false } as const;
const optionalDate = { type: "date", required: false, input: false } as const;

const googleClientId = process.env.NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;

export const authServer = betterAuth({
  baseURL: process.env.AUTH_URL,
  secret: process.env.AUTH_SECRET,
  trustedOrigins: [process.env.AUTH_URL, process.env.NEXT_PUBLIC_APP_URL].filter(
    (origin): origin is string => !!origin,
  ),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: usersTable,
      session: userSessionsTable,
      account: accountsTable,
      verification: verificationsTable,
    },
  }),
  advanced: {
    // Our tables use uuid primary keys
    database: { generateId: () => crypto.randomUUID() },
  },
  session: {
    expiresIn: SESSION_MAX_AGE_SECONDS,
    // Sliding window + absolute lifetime are handled in buildAppSession
    disableSessionRefresh: true,
    fields: { token: "sessionToken", updatedAt: "lastActivityAt" },
    additionalFields: {
      absoluteExpiresAt: optionalDate,
      stepUpAuthAt: optionalDate,
      authMethod: optionalString,
      impersonatedUserId: optionalString,
      deviceType: optionalString,
      browser: optionalString,
      os: optionalString,
      city: optionalString,
      country: optionalString,
      countryCode: optionalString,
      region: optionalString,
    },
  },
  account: {
    fields: {
      accountId: "providerAccountId",
      providerId: "provider",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
    },
    // Google accounts are linked from the profile page only, never on sign-in
    accountLinking: { enabled: true, disableImplicitLinking: true },
    updateAccountOnSignIn: false,
  },
  user: {
    validateUserInfo: validateOAuthUser,
    // users.password is NOT NULL and managed by userService; declared so the schema check passes
    additionalFields: { password: { ...optionalString, returned: false } },
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            disableSignUp: true,
          },
        }
      : {},
  databaseHooks,
  // Everything the app needs is exposed through the custom endpoints and buildAppSession
  disabledPaths: [
    "/sign-up/email",
    "/sign-in/email",
    "/link-social",
    "/unlink-account",
    "/list-accounts",
    "/account-info",
    "/get-access-token",
    "/refresh-token",
    "/update-user",
    "/change-email",
    "/change-password",
    "/set-password",
    "/delete-user",
    "/delete-user/callback",
    "/verify-password",
    "/verify-email",
    "/send-verification-email",
    "/request-password-reset",
    "/reset-password",
    "/list-sessions",
    "/revoke-session",
    "/revoke-sessions",
    "/revoke-other-sessions",
    "/update-session",
  ],
  plugins: [
    appSignIn(),
    // A null result (invalid session) is forwarded to the client as unauthenticated
    customSession(async ({ session }) => {
      const appSession = await buildAppSession(
        session as unknown as Parameters<typeof buildAppSession>[0],
      );
      return appSession as unknown as Session;
    }),
  ],
});

/**
 * Current application session (or null), memoised per request.
 * Shape: `{ user: { id, role, permissions, apps, ... }, sessionId, expires }`.
 */
export const auth = cache(async (): Promise<Session | null> => {
  const session = await authServer.api.getSession({ headers: await headers() });
  return (session as unknown as Session | null) ?? null;
});

// Re-export session token utilities for use by API routes
export {
  generateSessionUpdateToken,
  verifyAndConsumeToken,
  type SessionUpdateTokenData,
  type SessionUpdateTokenType,
} from "./session-token";

// Re-export helpers for use by other modules
export { getUserPermissionsData, getRequestMetadata } from "./helpers";

// Re-export security policies
export {
  SENSITIVE_ACTIONS,
  SESSION_INVALIDATION_TRIGGERS,
  STEP_UP_CONFIG,
  RATE_LIMIT_POLICY,
  SECURITY_EVENTS,
  requiresStepUp,
  getSessionInvalidationRule,
  getRateLimitPolicy,
  type SensitiveAction,
  type SessionInvalidationRule,
  type RateLimitPolicy,
  type SecurityEvent,
} from "./policy";
