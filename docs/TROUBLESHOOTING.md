# Troubleshooting

## Startup failures

- Missing env vars: verify `.env` against `docs/ENVIRONMENT.md`.
- Database errors: run `npm run db:check` and `npm run db:migrate`.

## Auth and login

- 2FA codes not arriving: check Gmail configuration and worker logs.
- Account locked: use `/api/admin/users/:userId/unlock`.

## File uploads

- SVGs are rejected by design.
- Large images may exceed the 4096px/50MP limits.

## Queue and email worker

- Ensure `REDIS_URL` is set and worker is running.
- Check `queue_jobs` for failures.

## Cron

- Confirm `CRON_SECRET` and `Authorization` header.
