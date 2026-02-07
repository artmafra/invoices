import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

interface RequestContext {
  requestId: string;
}

/**
 * AsyncLocalStorage for request-scoped context
 *
 * Stores requestId for the lifetime of each API request.
 * Allows logger to automatically include requestId without passing it through every function.
 *
 * @example
 * ```typescript
 * // In api-handler.ts
 * requestContext.run({ requestId: randomUUID() }, async () => {
 *   await handler(request, context);
 * });
 *
 * // Anywhere in the call stack
 * const requestId = requestContext.getRequestId(); // Returns the requestId
 * ```
 */
class RequestContextStore {
  private storage = new AsyncLocalStorage<RequestContext>();

  /**
   * Run a function with request context
   */
  run<T>(context: RequestContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  /**
   * Get the current requestId (or undefined if not in request context)
   */
  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }

  /**
   * Generate a new requestId
   */
  generateRequestId(): string {
    return randomUUID();
  }
}

export const requestContext = new RequestContextStore();
