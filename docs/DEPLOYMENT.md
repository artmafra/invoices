# Deployment

High-level deployment steps for production.

## 1) Configure environment

- Set all required variables (see `docs/ENVIRONMENT.md`).
- Ensure `AUTH_URL` and `NEXT_PUBLIC_APP_URL` are production URLs.
- **Configure connection pooling:** Set `DATABASE_POOL_SIZE` based on deployment type (see `docs/DATABASE-POOLING.md`).

## 2) Install and build

```bash
npm install
npm run build
```

## 3) Migrate and seed

```bash
npm run db:migrate
npm run db:init
```

## 4) Start services

- Web app: `npm run start`
- Worker: `npm run worker:email`

## 5) Schedule cron

- Call `/api/cron/cleanup` daily with `CRON_SECRET`.

## 6) Observability

- Configure log shipping from stdout
- Monitor 4xx/5xx, queue backlog, and auth failures
- **Monitor database connection pool usage** (see `docs/DATABASE-POOLING.md`)

---

## Connection Pooling

Database connection pooling is critical for production deployments to prevent connection exhaustion. This template includes built-in client-side pooling configured via environment variables.

**Quick Start:**

```bash
# Serverless (Vercel/Netlify)
DATABASE_POOL_SIZE=3-5

# Containers (Railway/Render)
DATABASE_POOL_SIZE=5-10

# Dedicated Servers
DATABASE_POOL_SIZE=10-20
```

**For comprehensive guidance including:**

- Provider-specific recommendations (Vercel, Netlify, Railway, Render, Fly.io, AWS, etc.)
- External pooler setup (PgBouncer, Supabase, Neon, RDS Proxy)
- Monitoring and troubleshooting
- Scaling strategies for 100+ instances

**See: `/docs/DATABASE-POOLING.md`**
