# Gmail Integration

Emails are sent through the Gmail API using OAuth credentials.

## Required env vars

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_FROM_EMAIL`

## Setup steps (summary)

1. Create OAuth credentials in Google Cloud Console.
2. Enable Gmail API for the project.
3. Generate a refresh token via OAuth Playground.
4. Add env vars and restart the app.

## Test

```bash
npm run test:email -- --to you@example.com
```

## Key files

- `src/lib/gmail.ts`
- `src/services/queues/email-queue.service.ts`
- `src/workers/email.worker.ts`
