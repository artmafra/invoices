import type { AuthMethod } from "@/types/auth/step-up-auth.types";

/** Info about the original admin user when impersonating */
export interface ImpersonatedBy {
  id: string;
  name: string;
  email: string;
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
  roleId: string | null;
  /** True if user has a system role (can view sensitive settings) */
  isSystemRole: boolean;
  permissions: string[];
  /** App IDs the user has access to (entitlements) */
  apps: string[];
  /** DB-backed session row ID used for server-side revocation/telemetry */
  sessionId?: string;
  /** Present when an admin is impersonating this user */
  impersonatedBy?: ImpersonatedBy;
  /** Method used for authentication (password, passkey, google) */
  authMethod?: AuthMethod;
  /** Timestamp (ms) of the last strong authentication (login) */
  lastAuthAt?: number;
  /** Timestamp (ms) of the last step-up verification */
  stepUpAuthAt?: number;
}

/**
 * Application session, produced by the Better Auth `customSession` plugin.
 * User details and permissions are always read fresh from the database.
 */
export interface Session {
  user: SessionUser;
  /** DB-backed session row ID */
  sessionId?: string;
  /** ISO timestamp when the session expires */
  expires: string;
}
