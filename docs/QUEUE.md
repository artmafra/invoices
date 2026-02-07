# BullMQ Queue

Background job processing using BullMQ with a separate worker process.

## Overview

- Uses native Redis (`REDIS_URL`) via ioredis.
- Email jobs are queued and processed by `src/workers/email.worker.ts`.
- Default queue options are centralized in `src/lib/queue/config.ts`.

## Configuration

Required:

- `REDIS_URL` (native Redis URL) - required in all environments
- `QUEUE_CONCURRENCY` (optional, default: 5)

## Running the worker

```bash
npm run worker:email
```

For local dev with the app:

```bash
npm run dev:full
```

## Key files

| Area                | Path                                         |
| ------------------- | -------------------------------------------- |
| Base queue          | `src/lib/queue/base-queue.ts`                |
| Queue config        | `src/lib/queue/config.ts`                    |
| Email queue service | `src/services/queues/email-queue.service.ts` |
| Email worker        | `src/workers/email.worker.ts`                |
| Queue job schema    | `src/schema/queue-jobs.schema.ts`            |
| Queue job storage   | `src/storage/queue-jobs.storage.ts`          |

## Email queue notes

- Worker limiter: 10 jobs/minute (Gmail API safety).
- Failed jobs are retried with exponential backoff (see `DEFAULT_QUEUE_OPTIONS`).
- Job activity is logged to `queue_jobs` for audit/monitoring.

## Adding a new queue (pattern)

1. Define a job type in `src/types/queue.ts`.
2. Create a queue service extending `BaseQueue`.
3. Implement a worker in `src/workers/<name>.worker.ts`.
4. Add a script in `package.json` (e.g., `worker:<name>`).

## Troubleshooting

- Worker not processing: verify `REDIS_URL` and that the worker process is running.
- Gmail failures: verify Gmail credentials and check worker logs.
