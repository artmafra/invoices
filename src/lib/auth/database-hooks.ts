import type { BetterAuthOptions } from "better-auth";
import type { AuthMethod } from "@/types/auth/step-up-auth.types";
import { logger } from "@/lib/logger";
import { accountService } from "@/services/runtime/account";
import { loginHistoryService } from "@/services/runtime/login-history";
import { userService } from "@/services/runtime/user";
import { userSessionService } from "@/services/runtime/user-session";
import { getMetadataFromHeaders } from "./helpers";

type DatabaseHooks = NonNullable<BetterAuthOptions["databaseHooks"]>;
type ValidateUserInfo = NonNullable<NonNullable<BetterAuthOptions["user"]>["validateUserInfo"]>;

/**
 * Enriches every new session row (device/geo/lifetime/auth method) and runs the
 * post-login side effects (login history, last login, new-login email).
 */
export const databaseHooks: DatabaseHooks = {
  user: {
    update: {
      // users.email_verified is a timestamp; Better Auth writes a boolean
      before: async (data) => {
        const { emailVerified } = data as { emailVerified?: unknown };
        if (typeof emailVerified !== "boolean") return { data };
        return { data: { ...data, emailVerified: emailVerified ? new Date() : null } as never };
      },
    },
  },
  session: {
    create: {
      before: async (session, ctx) => {
        const { userAgent, ipAddress } = getMetadataFromHeaders(
          ctx?.headers ?? ctx?.request?.headers,
        );
        const attributes = await userSessionService.buildSessionAttributes({
          userAgent,
          ipAddress,
        });

        // Sessions created by the OAuth callback have no explicit method
        const authMethod =
          (session as { authMethod?: string }).authMethod ??
          (ctx?.path?.startsWith("/callback") ? "google" : undefined);

        return {
          data: {
            ...session,
            ...attributes,
            authMethod,
            ipAddress: ipAddress ?? session.ipAddress,
            userAgent: userAgent ?? session.userAgent,
          },
        };
      },
      after: async (session, ctx) => {
        const { userAgent, ipAddress } = getMetadataFromHeaders(
          ctx?.headers ?? ctx?.request?.headers,
        );

        try {
          const user = await userService.getUserById(session.userId);
          await userService.updateLastLoginAt(session.userId);

          loginHistoryService.recordAttempt({
            userId: session.userId,
            userName: user?.name,
            identifier: user?.email,
            success: true,
            authMethod: ((session as { authMethod?: string }).authMethod ??
              "password") as AuthMethod,
            ipAddress,
            userAgent,
            sessionId: session.id,
          });

          userSessionService.onSessionCreated({
            userId: session.userId,
            userAgent,
            ipAddress,
            acceptLanguage: (ctx?.headers ?? ctx?.request?.headers)?.get("accept-language"),
          });
        } catch (error) {
          logger.error({ error, userId: session.userId }, "[Auth] Post-login side effects failed");
        }
      },
    },
  },
};

/**
 * Policy for Google sign-in. Only pre-linked, active accounts whose email still
 * matches may sign in (accounts are linked from the profile page, never on login).
 */
export const validateOAuthUser: ValidateUserInfo = async ({ user, source }, ctx) => {
  if (source.action !== "sign-in" || source.oauth?.providerId !== "google") return;

  const { ipAddress, userAgent } = getMetadataFromHeaders(ctx?.headers ?? ctx?.request?.headers);
  const googleEmail = typeof user.email === "string" ? user.email : undefined;

  const reject = (error: string, userId?: string) => {
    loginHistoryService.recordAttempt({
      userId,
      identifier: googleEmail,
      success: false,
      authMethod: "google",
      failureReason: error,
      ipAddress,
      userAgent,
    });
    return { error };
  };

  try {
    const googleId = String(source.oauth.profile?.sub ?? "");
    const linked = googleId
      ? await accountService.getAccountByProviderAccount("google", googleId)
      : null;
    if (!linked) return reject("google_not_linked");

    const existing = await userService.getUserById(linked.userId);
    if (!existing) return reject("user_not_found");
    if (!existing.isActive) return reject("account_deactivated", existing.id);
    if (existing.email.toLowerCase() !== googleEmail?.toLowerCase()) {
      return reject("email_mismatch", existing.id);
    }
  } catch (error) {
    logger.error({ error, email: googleEmail }, "[Auth] Google sign in error");
    return reject("internal_error");
  }
};
