import { Session } from "next-auth";
import { STEP_UP_CONFIG } from "@/lib/auth/policy";
import { ForbiddenError } from "@/lib/errors";

/**
 * Custom error code for step-up authentication required.
 * Frontend should catch this and display the step-up dialog.
 */
export const STEP_UP_REQUIRED_CODE = "STEP_UP_REQUIRED";

/**
 * Error thrown when step-up authentication is required.
 * Returns a 403 with code "STEP_UP_REQUIRED" so frontend
 * knows to show the step-up auth dialog.
 */
export class StepUpRequiredError extends ForbiddenError {
  constructor(message = "Step-up authentication required") {
    super(message, STEP_UP_REQUIRED_CODE);
    this.name = "StepUpRequiredError";
  }
}

interface RequireStepUpAuthOptions {
  /** Custom grace period in milliseconds (default: 10 minutes) */
  gracePeriod?: number;
}

/**
 * Server-side validation that step-up authentication has been completed.
 *
 * Checks if the user has recently authenticated (within grace period) by
 * verifying either `stepUpAuthAt` or `lastAuthAt` timestamps in the session.
 *
 * @param session - The current user session
 * @param options - Optional configuration
 * @throws StepUpRequiredError if step-up auth is required
 *
 * @example
 * ```ts
 * export const POST = withErrorHandler(async (request: NextRequest) => {
 *   const session = await auth();
 *   if (!session?.user?.id) throw new UnauthorizedError();
 *
 *   // Require step-up auth for this sensitive action
 *   requireStepUpAuth(session);
 *
 *   // Proceed with sensitive operation...
 * });
 * ```
 */
export function requireStepUpAuth(
  session: Session | null,
  options: RequireStepUpAuthOptions = {},
): void {
  const { gracePeriod = STEP_UP_CONFIG.WINDOW_MS } = options;

  if (!session?.user) {
    throw new StepUpRequiredError();
  }

  const stepUpAuthAt = session.user.stepUpAuthAt ?? 0;
  const lastAuthAt = session.user.lastAuthAt ?? 0;

  // Use the most recent of stepUpAuthAt or lastAuthAt
  const lastStrongAuth = Math.max(stepUpAuthAt, lastAuthAt);

  if (!lastStrongAuth) {
    throw new StepUpRequiredError();
  }

  const now = Date.now();
  const isWithinGracePeriod = now - lastStrongAuth < gracePeriod;

  if (!isWithinGracePeriod) {
    throw new StepUpRequiredError();
  }
}

/**
 * Check if step-up auth is valid without throwing.
 * Useful for conditional logic based on step-up status.
 *
 * @param session - The current user session
 * @param options - Optional configuration
 * @returns true if step-up auth is verified (within grace period)
 */
export function isStepUpAuthValid(
  session: Session | null,
  options: RequireStepUpAuthOptions = {},
): boolean {
  try {
    requireStepUpAuth(session, options);
    return true;
  } catch {
    return false;
  }
}
