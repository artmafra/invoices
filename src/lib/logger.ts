import pino from "pino";
import { requestContext } from "@/lib/request-context";

/**
 * Pino logger configuration
 *
 * Production: JSON logs to stdout (CloudWatch/Datadog-friendly)
 * Development: Pretty-printed logs with colors
 *
 * Log levels: fatal, error, warn, info, debug, trace
 *
 * @example
 * ```typescript
 * import { logger } from "@/lib/logger";
 *
 * logger.info("User logged in");
 * logger.error({ userId, error }, "Failed to send email");
 * logger.warn({ ip, reason }, "Invalid token attempt");
 *
 * // With child logger
 * const authLogger = logger.child({ service: "auth" });
 * authLogger.debug("Processing login");
 * ```
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: {
    env: process.env.NODE_ENV,
  },
  // Automatically include requestId from AsyncLocalStorage
  mixin() {
    const requestId = requestContext.getRequestId();
    return requestId ? { requestId } : {};
  },
  // Production: JSON to stdout
  // Development: Pretty logs
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});
