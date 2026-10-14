import type { BetterAuthPlugin, GenericEndpointContext } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import type { AuthMethod } from "@/types/auth/step-up-auth.types";
import { logger } from "@/lib/logger";
import { createPending2faToken, verifyPending2faToken } from "@/lib/pending-2fa-token";
import { checkRateLimit, constantTimeDelay } from "@/lib/rate-limit";
import { loginHistoryService } from "@/services/runtime/login-history";
import { loginProtectionService } from "@/services/runtime/login-protection";
import { passkeyService } from "@/services/runtime/passkey";
import { twoFactorService } from "@/services/runtime/two-factor";
import { userService } from "@/services/runtime/user";
import { getMetadataFromHeaders } from "./helpers";
import { verifyAndConsumeToken } from "./session-token";

function invalidCredentials(): never {
  throw new APIError("UNAUTHORIZED", {
    code: "INVALID_CREDENTIALS",
    message: "Invalid credentials",
  });
}

/** Creates the session row, then sets the signed session cookie on the response. */
async function startSession(ctx: GenericEndpointContext, userId: string, authMethod: AuthMethod) {
  const session = await ctx.context.internalAdapter.createSession(userId, false, { authMethod });
  const user = await ctx.context.internalAdapter.findUserById(userId);

  if (!session || !user) {
    throw new APIError("INTERNAL_SERVER_ERROR", {
      code: "SESSION_CREATE_FAILED",
      message: "Failed to create session",
    });
  }

  await setSessionCookie(ctx, { session, user });
}

/**
 * App-specific sign-in endpoints. Credential checks, lockout, 2FA and passkey
 * verification stay in the existing services; Better Auth only owns the session.
 */
export const appSignIn = () =>
  ({
    id: "app-sign-in",
    endpoints: {
      signInCredentials: createAuthEndpoint(
        "/sign-in/credentials",
        {
          method: "POST",
          body: z.object({ email: z.string().min(1), password: z.string().min(1) }),
        },
        async (ctx) => {
          const { ipAddress, userAgent } = getMetadataFromHeaders(ctx.headers);
          const email = ctx.body.email.toLowerCase();

          // Look up user early to have userId for login history (even for failures)
          const existingUser = await userService.getUserByEmail(email);
          const userId = existingUser?.id;

          const fail = async (failureReason: string, user?: { id: string }): Promise<never> => {
            loginHistoryService.recordAttempt({
              userId: user?.id ?? userId,
              identifier: email,
              success: false,
              authMethod: "password",
              failureReason,
              ipAddress,
              userAgent,
            });
            await constantTimeDelay(100, 200);
            return invalidCredentials();
          };

          try {
            // Rate limit by IP + email combo to prevent brute force attacks
            const rateLimitResult = await checkRateLimit(
              "authSignin",
              `${ipAddress || "unknown"}:${email}`,
            );
            if (rateLimitResult && !rateLimitResult.success) return await fail("rate_limited");

            const lockStatus = await loginProtectionService.checkLockout(email);
            if (lockStatus.locked) return await fail("account_locked");

            const user = await userService.verifyPassword(ctx.body.email, ctx.body.password);

            if (!user) {
              await loginProtectionService.recordFailedAttempt(email);
              return await fail("invalid_credentials");
            }

            if (!user.isActive) return await fail("account_deactivated", user);

            await loginProtectionService.clearAttempts(email);

            const availableMethods = await twoFactorService.getAvailableMethods(user.id);

            if (availableMethods.hasAny) {
              // Auto-send email code if email is the only 2FA method available
              if (availableMethods.email && !availableMethods.totp) {
                await twoFactorService.emailSendCode(user.id, user.email);
              }

              return ctx.json({
                twoFactorRequired: true as const,
                token: createPending2faToken({
                  userId: user.id,
                  email: user.email,
                  availableMethods,
                }),
                userId: user.id,
                email: user.email,
                availableMethods,
              });
            }

            await startSession(ctx, user.id, "password");
            return ctx.json({ twoFactorRequired: false as const });
          } catch (error) {
            if (error instanceof APIError) throw error;
            logger.error({ error, email, ipAddress }, "[Auth] Credentials authentication error");
            return await fail("internal_error");
          }
        },
      ),

      signInTwoFactor: createAuthEndpoint(
        "/sign-in/two-factor",
        {
          method: "POST",
          body: z.object({
            token: z.string().min(1),
            code: z.string().min(1),
            method: z.enum(["email", "totp", "backup"]).optional(),
          }),
        },
        async (ctx) => {
          // The pending token proves the password step succeeded for this user
          let pending: ReturnType<typeof verifyPending2faToken>;
          try {
            pending = verifyPending2faToken(ctx.body.token);
          } catch {
            throw new APIError("UNAUTHORIZED", {
              code: "INVALID_2FA_TOKEN",
              message: "Session has expired. Please try logging in again.",
            });
          }

          try {
            const rateLimitResult = await checkRateLimit("twoFactorVerify", pending.userId);
            if (rateLimitResult && !rateLimitResult.success) {
              await constantTimeDelay(100, 200);
              return invalidCredentials();
            }

            const isValidCode = await twoFactorService.verifyCode(
              pending.userId,
              ctx.body.code,
              ctx.body.method,
            );
            if (!isValidCode) {
              await constantTimeDelay(100, 200);
              return invalidCredentials();
            }

            const user = await userService.getUserById(pending.userId);
            if (!user || !user.isActive) return invalidCredentials();

            await startSession(ctx, user.id, "password");
            return ctx.json({ success: true as const });
          } catch (error) {
            if (error instanceof APIError) throw error;
            logger.error({ error }, "[Auth] 2FA verification error");
            return invalidCredentials();
          }
        },
      ),

      signInPasskey: createAuthEndpoint(
        "/sign-in/passkey",
        {
          method: "POST",
          body: z.object({ userId: z.string().min(1), verificationToken: z.string().min(1) }),
        },
        async (ctx) => {
          const { ipAddress, userAgent } = getMetadataFromHeaders(ctx.headers);
          const { userId, verificationToken } = ctx.body;

          const fail = (failureReason: string, user?: { id: string; email: string }): never => {
            loginHistoryService.recordAttempt({
              userId: user?.id,
              identifier: user?.email ?? userId,
              success: false,
              authMethod: "passkey",
              failureReason,
              ipAddress,
              userAgent,
            });
            return invalidCredentials();
          };

          try {
            // SECURITY: proves WebAuthn verification actually happened server-side
            const tokenData = await verifyAndConsumeToken(
              verificationToken,
              "passkey-sign-in",
              userId,
            );
            if (!tokenData) {
              logger.warn({ userId, ipAddress }, "[Auth] Passkey sign-in with invalid token");
              return fail("invalid_verification_token");
            }

            const user = await userService.getUserById(userId);
            if (!user) return fail("user_not_found");
            if (!user.isActive) return fail("account_deactivated", user);

            if (!(await passkeyService.hasPasskeys(user.id))) {
              return fail("no_passkeys_registered", user);
            }

            await startSession(ctx, user.id, "passkey");
            return ctx.json({ success: true as const });
          } catch (error) {
            if (error instanceof APIError) throw error;
            logger.error({ error, userId }, "[Auth] Passkey authentication error");
            return fail("internal_error");
          }
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
