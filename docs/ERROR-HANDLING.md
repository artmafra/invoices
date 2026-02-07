# Error Handling

Consistent server and client error handling via shared helpers and standard error shapes.

## API error flow

- Wrap route handlers with `withErrorHandler` from `src/lib/api-handler.ts`.
- Throw `ApiError` subclasses from `src/lib/errors.ts`.
- Zod validation errors are normalized automatically.

### Response shape

```json
{ "error": "Message", "code": "ERROR_CODE", "details": [] }
```

## Common error classes

- `ValidationError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `RateLimitError` (429)
- `ServiceUnavailableError` (503)

## Client-side handling

Use `apiErrorFromResponseBody` and `handleMutationError` in `src/lib/api-request-error.ts` to map API codes to user-facing messages.

## React error boundaries

Use the shared error boundary wrapper:

```tsx
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";

<ErrorBoundary fallback={AdminErrorFallback}>
  <PageContent />
</ErrorBoundary>;
```

## Key files

- `src/lib/api-handler.ts`
- `src/lib/errors.ts`
- `src/lib/api-request-error.ts`
- `src/components/shared/error-boundary.tsx`
