import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { ApiError, fromZodError, InternalServerError, toErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { requestContext } from "@/lib/request-context";

// Generic route handler type that accepts any params structure
type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

/**
 * Handler type that accepts any route context shape.
 * Routes can have different param structures (single params, array params, optional params).
 * The original `any` here is intentional for maximum flexibility across all route patterns.
 */
type AnyRouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * Wraps an API route handler with standardized error handling and request context.
 *
 * Catches and formats:
 * - ApiError subclasses → appropriate HTTP status with { error, code, details? }
 * - ZodError → 400 with validation details
 * - Unknown errors → 500 Internal Server Error
 *
 * Also establishes AsyncLocalStorage context with requestId for the lifetime of the request.
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandler(async (request) => {
 *   const user = await userService.findById(id);
 *   if (!user) {
 *     throw new NotFoundError("User");
 *   }
 *   return NextResponse.json(user);
 * });
 * ```
 */
export function withErrorHandler(handler: AnyRouteHandler): RouteHandler {
  return async (request: NextRequest, context?) => {
    // Generate requestId and establish AsyncLocalStorage context
    const requestId = requestContext.generateRequestId();

    return requestContext.run({ requestId }, async () => {
      try {
        return await handler(request, context);
      } catch (error) {
        // Handle custom API errors
        if (error instanceof ApiError) {
          return NextResponse.json(toErrorResponse(error), {
            status: error.statusCode,
          });
        }

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          const validationError = fromZodError(error);
          return NextResponse.json(toErrorResponse(validationError), {
            status: 400,
          });
        }

        // Log unexpected errors for debugging
        logger.error({ error, path: request.nextUrl.pathname }, "[API] Unhandled error");

        // Return generic 500 for unknown errors
        const internalError = new InternalServerError();
        return NextResponse.json(toErrorResponse(internalError), {
          status: 500,
        });
      }
    });
  };
}

/**
 * Parse and validate request body with Zod schema.
 * Throws ValidationError on failure.
 *
 * @example
 * ```typescript
 * const data = await parseBody(request, createUserSchema);
 * ```
 */
export async function parseBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Parse and validate URL search params with Zod schema.
 * Throws ValidationError on failure.
 *
 * @example
 * ```typescript
 * const { page, limit } = await parseSearchParams(request, paginationSchema);
 * ```
 */
export function parseSearchParams<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): z.infer<T> {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  return schema.parse(searchParams);
}
