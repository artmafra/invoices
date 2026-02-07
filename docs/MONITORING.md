# Monitoring

Suggested metrics and checks for production observability.

## Logging

- Use structured logs (see `docs/LOGGING.md`).
- Track `requestId` to trace requests.

## Metrics to watch

- HTTP: 4xx/5xx rates, latency, slow endpoints
- Auth: login failures, rate limit hits, account lockouts
- Queue: waiting/failed jobs, worker uptime
- Database: connection errors, slow queries
- Storage: upload failures, image proxy errors

## Health checks

- App uptime (`/` or a lightweight API endpoint)
- Database connection (`npm run db:check`)
- Queue worker liveness (process check + logs)

## Alerting

- Sustained 5xx or elevated latency
- Queue backlog or repeated job failures
- Rate limiting unavailable in production (503s)

## Correlation

- Include `requestId` in logs and error reports
- Log userId and sessionId for sensitive operations
