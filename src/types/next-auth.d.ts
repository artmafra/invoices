import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";
import type { AuthMethod } from "@/types/auth/step-up-auth.types";

/**
 * Info about the original admin user when impersonating
 */
interface ImpersonatedBy {
  id: string;
  name: string | null;
  email: string;
}

declare module "next-auth" {
  interface Session {
    /** DB-backed session row ID used for server-side revocation/telemetry */
    sessionId?: string;
    user: {
      id: string;
      role: string;
      roleId: string | null;
      /** True if user has a system role (can view sensitive settings) */
      isSystemRole: boolean;
      permissions: string[];
      /** App IDs the user has access to (entitlements) */
      apps: string[];
      twoFactorEnabled?: boolean;
      twoFactorVerified?: boolean;
      /** Present when an admin is impersonating this user */
      impersonatedBy?: ImpersonatedBy;
      /**
       * User preferences are NOT stored in session.
       * Theme, language, timezone, and pagination size are device-bound
       * (localStorage/cookies), NOT user-bound.
       *
       * This is intentional:
       * - Logging out does NOT reset preferences
       * - Impersonating another user does NOT change preferences
       * - Preferences follow the device, not the account
       *
       * @see @/lib/preferences
       */
      /** Method used for authentication (password, passkey, google) */
      authMethod?: AuthMethod;
      /** Timestamp of last strong authentication (login or step-up) */
      lastAuthAt?: number;
      /** Timestamp of last step-up verification */
      stepUpAuthAt?: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    roleId: string | null;
    /** True if user has a system role (can view sensitive settings) */
    isSystemRole: boolean;
    permissions: string[];
    /** App IDs the user has access to (entitlements) */
    apps: string[];
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
    requiresTwoFactor?: boolean;
    sessionId?: string;
    /** Present when an admin is impersonating this user */
    impersonatedBy?: ImpersonatedBy;
    /** Method used for authentication (password, passkey, google) */
    authMethod?: AuthMethod;
    /** Timestamp of last strong authentication (login or step-up) */
    lastAuthAt?: number;
    /** Timestamp of last step-up verification */
    stepUpAuthAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: string;
    roleId: string | null;
    /** True if user has a system role (can view sensitive settings) */
    isSystemRole: boolean;
    permissions: string[];
    /** App IDs the user has access to (entitlements) */
    apps: string[];
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
    image?: string | null;
    sessionId?: string;
    /** Present when an admin is impersonating this user */
    impersonatedBy?: ImpersonatedBy;
    /** Token invalidation flag */
    invalidated?: boolean;
    /** Method used for authentication (password, passkey, google) */
    authMethod?: AuthMethod;
    /** Timestamp of last strong authentication (login or step-up) */
    lastAuthAt?: number;
    /** Timestamp of last step-up verification */
    stepUpAuthAt?: number;
  }
}
