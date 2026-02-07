# Cron Jobs

Scheduled maintenance endpoint for cleanup tasks.

## Endpoint

- `GET /api/cron/cleanup`
- Requires `Authorization: Bearer <CRON_SECRET>`

## What it does

- Deletes login history older than 90 days
- Deletes activity logs older than 90 days
- Cleans up expired/revoked sessions
- Deletes expired tokens
- Deletes completed queue jobs older than 30 days
- Deletes failed queue jobs older than 90 days

## Scheduling

Use Vercel, Railway, Render, or any cron service to call the endpoint daily.

Example header:

```
Authorization: Bearer your-cron-secret
```
