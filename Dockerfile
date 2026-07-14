# =============================================================================
# Stage 1: base — sets up pnpm + node on Alpine
# =============================================================================
FROM node:22-alpine AS base

RUN npm install -g pnpm@11.0.9

ENV CI=true

WORKDIR /app

# =============================================================================
# Stage 2: deps — production dependencies only
# =============================================================================
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --no-frozen-lockfile --prod

# =============================================================================
# Stage 3: devdeps — all dependencies (needed to build + run workers via tsx)
# =============================================================================
FROM base AS devdeps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --no-frozen-lockfile

# =============================================================================
# Stage 4: builder — compiles the Next.js app
# =============================================================================
FROM devdeps AS builder

# Declare the arguments here so they are available during 'pnpm build'
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID

# Map them to environment variables for the build process
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID

# Dummy variables to satisfy Zod validation during build time
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
ENV REDIS_URL="redis://localhost:6379"
ENV AUTH_SECRET="builder-secret-must-be-32-chars-long-or-more"
ENV AUTH_URL="http://localhost:3000"
ENV ENCRYPTION_KEY="builder-secret-must-be-32-chars-long-or-more"
ENV WEBAUTHN_RP_ID="localhost"
ENV WEBAUTHN_ORIGINS="http://localhost:3000"
ENV GMAIL_CLIENT_ID="dummy"
ENV GMAIL_CLIENT_SECRET="dummy"
ENV GMAIL_REFRESH_TOKEN="dummy"
ENV GMAIL_FROM_EMAIL="dummy@example.com"
ENV SKIP_ENV_VALIDATION=true

COPY . .

# Validate env at build time is skipped (instrumentation runs at runtime).
# Disable telemetry during build.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_OUTPUT_STANDALONE=true

RUN pnpm build

# =============================================================================
# Stage 5: runner — minimal production image for the Next.js app
# =============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache curl

# Create a non-root user/group (nextjs:nodejs)
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets into the correct location expected by standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy public folder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

# =============================================================================
# Stage 6: worker — image for BullMQ workers (runs via tsx, needs full source)
# =============================================================================
FROM node:22-alpine AS worker

RUN npm install -g pnpm@11.0.9

# Create a non-root user/group FIRST (before WORKDIR)
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 worker

WORKDIR /app

# Fix ownership of working directory (WORKDIR created it as root)
RUN chown worker:nodejs /app

ENV NODE_ENV=production

# Copy all deps (tsx is a devDependency — needed to run workers)
COPY --from=devdeps --chown=worker:nodejs /app/node_modules ./node_modules
# Copy source
COPY --chown=worker:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json ./
COPY --chown=worker:nodejs src ./src
# Copy scripts, drizzle config, and migrations (needed for db:bootstrap)
COPY --chown=worker:nodejs scripts ./scripts
COPY --chown=worker:nodejs drizzle.config.ts ./
COPY --chown=worker:nodejs drizzle ./drizzle

USER worker

# CMD is intentionally omitted — overridden per service in docker-compose.yml
