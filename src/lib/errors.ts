import { z } from "zod/v4";

/**
 * Base API error class for consistent error handling across the application.
 * All custom errors should extend this class.
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * 400 Bad Request - Invalid input data or validation failure
 */
export class ValidationError extends ApiError {
  constructor(message = "Validation failed", detailsOrCode?: unknown, code = "VALIDATION_ERROR") {
    // If second param is a string without third param, treat it as code for backwards compatibility
    const actualCode =
      typeof detailsOrCode === "string" && arguments.length === 2 ? detailsOrCode : code;
    const actualDetails =
      typeof detailsOrCode === "string" && arguments.length === 2 ? undefined : detailsOrCode;
    super(400, message, actualCode, actualDetails);
    this.name = "ValidationError";
  }
}

/**
 * 401 Unauthorized - Authentication required or invalid credentials
 */
export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED") {
    super(401, message, code);
    this.name = "UnauthorizedError";
  }
}

/**
 * 403 Forbidden - Authenticated but lacks permission
 */
export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", code = "FORBIDDEN") {
    super(403, message, code);
    this.name = "ForbiddenError";
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends ApiError {
  constructor(resource = "Resource", code = "NOT_FOUND") {
    super(404, `${resource} not found`, code);
    this.name = "NotFoundError";
  }
}

/**
 * 409 Conflict - Resource already exists or state conflict
 */
export class ConflictError extends ApiError {
  constructor(message = "Resource already exists", code = "CONFLICT") {
    super(409, message, code);
    this.name = "ConflictError";
  }
}

/**
 * 403 Account Locked - Too many failed login attempts
 */
export class AccountLockedError extends ApiError {
  constructor(message = "Account temporarily locked", retryAfter?: number) {
    super(403, message, "ACCOUNT_LOCKED", retryAfter ? { retryAfter } : undefined);
    this.name = "AccountLockedError";
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends ApiError {
  constructor(message = "Too many requests", retryAfter?: number) {
    super(429, message, "RATE_LIMIT_EXCEEDED", retryAfter ? { retryAfter } : undefined);
    this.name = "RateLimitError";
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalServerError extends ApiError {
  constructor(message = "Internal server error", code = "INTERNAL_ERROR") {
    super(500, message, code);
    this.name = "InternalServerError";
  }
}

/**
 * 503 Service Unavailable - External service failure
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message = "Service temporarily unavailable", code = "SERVICE_UNAVAILABLE") {
    super(503, message, code);
    this.name = "ServiceUnavailableError";
  }
}

/**
 * Convert Zod validation errors to a ValidationError with formatted issues
 */
export function fromZodError(error: z.ZodError): ValidationError {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return new ValidationError("Invalid input data", issues);
}

/**
 * Standard error response shape for API endpoints
 */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Convert an ApiError to a standard error response object
 */
export function toErrorResponse(error: ApiError): ErrorResponse {
  return {
    error: error.message,
    code: error.code,
    ...(error.details !== undefined && { details: error.details }),
  };
}
