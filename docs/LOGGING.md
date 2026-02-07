# Logging

Structured logging with Pino and request-scoped IDs via AsyncLocalStorage.

## Overview

- JSON logs in production, pretty logs in development.
- `requestId` is injected into logs for API routes.
- Logs are written to stdout (12-factor friendly).

## Configuration

- `LOG_LEVEL`: `trace|debug|info|warn|error|fatal`
- Default: `info` in production, `debug` in development

## Usage

```ts
import { logger } from "@/lib/logger";

logger.info("User logged in");
logger.warn({ userId, attempts }, "Rate limit approaching");
logger.error({ error, userId }, "Password reset failed");
```

## Request tracing

- `withErrorHandler` creates a `requestId` per request.
- `src/lib/request-context.ts` stores the id in AsyncLocalStorage.
- The logger mixin adds `requestId` automatically.

## Edge runtime

The logger uses `async_hooks` and is not safe for Edge runtimes. Use `console.*` in middleware or edge code paths.

## Key files

- `src/lib/logger.ts`
- `src/lib/request-context.ts`
- `src/lib/api-handler.ts`
