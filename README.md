# Next.js Full-Stack Web Application Template

Production-ready **Next.js 16** template for full-stack apps with authentication, admin tools, background jobs, and a scalable architecture.

## Highlights

- Auth: email/password, Google OAuth, passkeys (WebAuthn), email + TOTP 2FA, backup codes
- Admin: users, roles, permissions, sessions, impersonation, activity log with integrity checks
- Accounts: invitations, multi-email management, password policy and reset flows
- Apps: multi-app registry with example modules (notes, tasks, games)
- Email: React Email templates + Gmail API, async delivery via BullMQ worker
- Storage: Google Cloud Storage with image proxy and responsive avatars
- i18n: next-intl with namespaced translations (en-US, pt-BR)
- Security: rate limiting, step-up auth, encryption at rest, account lockout
- Ops: logging, monitoring, migrations, cron maintenance

## Tech stack

| Category   | Technology                         |
| ---------- | ---------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack) |
| Language   | TypeScript 5                       |
| Database   | PostgreSQL + Drizzle ORM           |
| Auth       | Auth.js v5 (next-auth)             |
| Validation | Zod 4 + drizzle-zod                |
| UI         | shadcn/ui + Radix UI               |
| Styling    | Tailwind CSS v4                    |
| Data       | TanStack Query + Table             |
| i18n       | next-intl                          |
| Email      | React Email + Gmail API            |
| Storage    | Google Cloud Storage + Sharp       |
| Queue      | BullMQ (Redis)                     |

## Quick start

### Prerequisites

- Node.js 18+ (20+ recommended)
- PostgreSQL 14+
- Redis (native) for BullMQ in production
- Redis for rate limiting, caching, and background jobs
- Google Cloud account (OAuth, Gmail API, Cloud Storage)

### Install

```bash
git clone https://github.com/relaxeaza/template.git
cd template
npm install
cp .process.env.example .env
```

### Database

```bash
npm run db:migrate
npm run db:init
# Optional demo data
npm run db:seed:demo
```

**Production:** Configure connection pooling via `DATABASE_POOL_SIZE` environment variable. See `docs/DATABASE-POOLING.md` for deployment-specific recommendations.

### Run locally

- App only: `npm run dev`
- App + worker: `npm run dev:full`
- Email worker only: `npm run worker:email`

App runs at `http://localhost:3000` by default.

## Documentation

Start here: `docs/README.md`.

## Environment variables

Create `.env` from `.process.env.example` and fill the required values.

- Core: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `ENCRYPTION_KEY`
- Auth: `NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_SECRET`, `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGINS`
- Email: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_FROM_EMAIL`
- Storage: `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_STORAGE_BUCKET`, `GOOGLE_CLOUD_CREDENTIALS`
- Rate limiting: `REDIS_URL`
- Queue: `REDIS_URL`, `QUEUE_CONCURRENCY`
- Cron: `CRON_SECRET`
- Dev helpers: `TEST_DEFAULT_PASSWORD`, optional `LOG_LEVEL`

Full list and validation steps: `docs/ENVIRONMENT.md`.

## Available scripts

| Script                    | Description                       |
| ------------------------- | --------------------------------- |
| `npm run dev`             | Start development server          |
| `npm run dev:full`        | Run dev server + email worker     |
| `npm run build`           | Build for production              |
| `npm run start`           | Start production server           |
| `npm run worker:email`    | Run the BullMQ email worker       |
| `npm run worker:all`      | Run all workers (currently email) |
| `npm run check:lint`      | ESLint                            |
| `npm run check:types`     | TypeScript `--noEmit`             |
| `npm run check:format`    | Prettier format check             |
| `npm run format`          | Prettier write                    |
| `npm run db:generate`     | Generate Drizzle migrations       |
| `npm run db:migrate`      | Apply migrations                  |
| `npm run db:studio`       | Open Drizzle Studio               |
| `npm run db:push`         | Push schema (dev only)            |
| `npm run db:init`         | Initialize DB (roles/settings)    |
| `npm run db:seed`         | Seed baseline data                |
| `npm run db:seed:demo`    | Seed demo fixtures                |
| `npm run db:check`        | Check DB connection               |
| `npm run db:reset`        | Drop/recreate DB (destructive)    |
| `npm run db:reencrypt`    | Re-encrypt sensitive data         |
| `npm run user:create`     | Create a user via CLI             |
| `npm run email:dev`       | React Email preview server        |
| `npm run test:email`      | Test Gmail configuration          |
| `npm run test:storage`    | Test GCS configuration            |
| `npm run test:rate-limit` | Test Redis rate limiting          |
| `npm run help`            | Script helper output              |

## Project structure

```
src/
  app/             # Next.js App Router pages and API routes
  components/      # UI components (admin, public, shared, shadcn)
  config/          # Registries (apps, settings, commands, shortcuts)
  db/              # Drizzle schemas
  emails/          # React Email templates
  hooks/           # React Query hooks
  i18n/            # next-intl configuration
  lib/             # Core utilities (auth, logging, rate limits, etc.)
  locales/         # Translations (en-US, pt-BR)
  services/        # Business logic
  storage/         # Data access layer
  types/           # Shared TS types
  validations/     # Zod schemas
  workers/         # BullMQ workers
```

## License

MIT
