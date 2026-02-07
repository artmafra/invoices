import NextAuth from "next-auth";
import { jwtCallback, sessionCallback, signInCallback } from "./callbacks";
import {
  credentialsProvider,
  googleProvider,
  passkeyProvider,
  twoFactorProvider,
} from "./providers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [googleProvider, credentialsProvider, twoFactorProvider, passkeyProvider],
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  session: {
    strategy: "jwt",
    // Sliding sessions are implemented in DB session tracking; keep JWT maxAge aligned.
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax", // Explicit CSRF protection
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
    signIn: signInCallback,
  },
  pages: {
    signIn: "/admin/login",
  },
});

// Re-export session token utilities for use by API routes
export {
  generateSessionUpdateToken,
  verifyAndConsumeToken,
  type SessionUpdateTokenData,
  type SessionUpdateTokenType,
} from "./session-token";

// Re-export helpers for use by other modules
export { getUserPermissionsData, getRequestMetadata, createSessionForUser } from "./helpers";

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
