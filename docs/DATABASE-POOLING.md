# Database Connection Pooling

Comprehensive guide to configuring and scaling PostgreSQL connection pooling for production deployments.

## Overview

Database connection pooling prevents connection exhaustion when scaling horizontally. Each app instance maintains a pool of reusable PostgreSQL connections.

**Why This Matters:**

PostgreSQL has a finite `max_connections` limit (default: 100). In serverless environments where multiple instances spawn concurrently, improper pooling causes connection exhaustion:

```
10 serverless instances × 10 connections each = 100 connections
Result: Database refuses new connections, app crashes
```

With proper pooling (`DATABASE_POOL_SIZE=5`):

```
20 serverless instances × 5 connections each = 100 connections
Result: Stable under 2x load
```

---

## Quick Start

### Basic Configuration

Add to `.env`:

```bash
DATABASE_POOL_SIZE=5              # Max connections per instance (default: 5)
DATABASE_IDLE_TIMEOUT=20          # Close idle connections after N seconds (default: 20)
DATABASE_CONNECT_TIMEOUT=10       # Connection attempt timeout (default: 10)
```

### Recommended Pool Sizes

| Deployment Type                 | Pool Size             | Notes                                           |
| ------------------------------- | --------------------- | ----------------------------------------------- |
| **Serverless (Vercel/Netlify)** | 3-5                   | Multiple instances spawn dynamically; keep low  |
| **Containers (Railway/Render)** | 5-10                  | Persistent instances; can handle more           |
| **Dedicated Servers**           | 10-20                 | Single long-running process; higher limits safe |
| **High Scale (100+ instances)** | 3-5 + External Pooler | Use PgBouncer (see below)                       |

---

## Two Pooling Strategies

### 1. Client-Side Pooling (Built-In)

Each app instance manages its own connection pool using postgres-js. Configured via environment variables.

**When to use:**

- Small scale (1-20 instances)
- Development and staging
- Database has high `max_connections` limit (500+)

**Configuration:**

```typescript
// src/db/index.ts (already implemented)
const poolConfig = {
  max: parseInt(process.env.DATABASE_POOL_SIZE ?? "5", 10),
  idle_timeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT ?? "20", 10),
  connect_timeout: parseInt(process.env.DATABASE_CONNECT_TIMEOUT ?? "10", 10),
};

const client = postgres(process.env.DATABASE_URL, poolConfig);
```

**Limits:**

```
Total connections = number of instances × DATABASE_POOL_SIZE
Must stay under PostgreSQL max_connections limit
```

### 2. Server-Side Pooling (External)

External pooler (PgBouncer, Supabase Pooler, Neon) sits between app and database. Maintains persistent database connections and multiplexes app requests.

**When to use:**

- High scale (20+ instances)
- Serverless deployments (Vercel/Netlify)
- Seeing "too many connections" errors
- Database connection limit reached

**Benefits:**

- Unlimited app instances share fixed database connection pool
- 40x multiplier: 1000 app instances → 25 database connections
- Automatic failover and connection retry
- Query routing (read replicas support)

---

## Provider-Specific Guidance

### Vercel

**Characteristics:**

- Serverless functions spawn dynamically under load (10+ concurrent)
- Each function is a separate Node.js instance
- Functions are ephemeral (short-lived)

**Recommended Configuration:**

```bash
DATABASE_POOL_SIZE=3    # Allows 30+ concurrent functions
```

**Best Practices:**

- Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (built-in pooling)
- Or external pooler: [Supabase Pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler) or [Neon](https://neon.tech/docs/connect/connection-pooling)
- Monitor function concurrency in Vercel dashboard

### Netlify

**Characteristics:**

- Similar serverless scaling to Vercel
- Functions scale independently per route

**Recommended Configuration:**

```bash
DATABASE_POOL_SIZE=3
```

**Best Practices:**

- Works well with [Neon](https://neon.tech) (serverless-native Postgres)
- Enable connection pooling in database provider
- Monitor function execution duration (timeouts indicate connection issues)

### Railway

**Characteristics:**

- Persistent containers (1-10 instances typical)
- Longer-lived connections
- Built-in connection management

**Recommended Configuration:**

```bash
DATABASE_POOL_SIZE=10
```

**Best Practices:**

- Railway Postgres includes connection management
- No external pooler needed for most use cases
- Scale vertically before horizontally (upgrade container size first)

### Render

**Characteristics:**

- Persistent containers with autoscaling
- Can scale to 50+ instances under load

**Recommended Configuration:**

```bash
DATABASE_POOL_SIZE=5-10    # Lower if autoscaling aggressively
```

**Best Practices:**

- For 20+ instances, use [PgBouncer add-on](https://render.com/docs/deploy-pgbouncer)
- Monitor active connections in Render dashboard
- Set min/max instance counts to control connection usage

### Fly.io

**Characteristics:**

- Persistent VMs with regional scaling
- Multi-region deployments supported

**Recommended Configuration:**

```bash
DATABASE_POOL_SIZE=10
```

**Best Practices:**

- [Fly Postgres](https://fly.io/docs/postgres/) handles replication
- External pooler optional for single-region
- For multi-region: use Fly Postgres with connection pooling enabled

### Self-Hosted (AWS/GCP/Azure)

**Characteristics:**

- Full control over infrastructure
- Can configure PostgreSQL `max_connections` directly

**Recommended Configuration:**

```bash
DATABASE_POOL_SIZE=10-20    # Single-region
DATABASE_POOL_SIZE=5        # Multi-region with external pooler
```

**Best Practices:**

- Use [PgBouncer](https://www.pgbouncer.org/) or [pgpool-II](https://www.pgpool.net/) for multi-region
- Increase PostgreSQL `max_connections` if needed (requires restart)
- Set up read replicas for read-heavy workloads

---

## External Pooler Setup

### Option 1: PgBouncer (Self-Hosted)

**What is PgBouncer?**

Lightweight connection pooler that multiplexes app connections to a fixed pool of database connections.

**Installation:**

```bash
# Ubuntu/Debian
sudo apt-get install pgbouncer

# macOS
brew install pgbouncer

# Docker
docker run -d --name pgbouncer \
  -p 6432:6432 \
  -v /path/to/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini \
  pgbouncer/pgbouncer
```

**Configuration:**

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
yourdb = host=postgres-host dbname=yourdb port=5432

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Connection pool settings
pool_mode = transaction          # Best for stateless apps
max_client_conn = 1000           # App connections (high limit)
default_pool_size = 25           # Actual Postgres connections (low limit)
reserve_pool_size = 5
reserve_pool_timeout = 3

# Performance tuning
server_idle_timeout = 600
server_lifetime = 3600
server_connect_timeout = 10
query_timeout = 60
```

**Create user credentials:**

```bash
# Format: "username" "password"
echo '"youruser" "yourpassword"' > /etc/pgbouncer/userlist.txt
chmod 600 /etc/pgbouncer/userlist.txt
```

**Start service:**

```bash
sudo systemctl enable pgbouncer
sudo systemctl start pgbouncer
sudo systemctl status pgbouncer
```

**Update DATABASE_URL:**

```bash
# Before (direct connection)
DATABASE_URL=postgres://user:pass@postgres-host:5432/yourdb

# After (through PgBouncer)
DATABASE_URL=postgres://user:pass@pgbouncer-host:6432/yourdb
```

**Pool Modes:**

- `transaction` (recommended): Connection released after each transaction
  - Stateless, safe for most apps
  - **Use this** unless you need session-level features
- `session`: Connection held for entire client session
  - Needed for: `SET` statements, temp tables, advisory locks
  - Lower concurrency (1:1 mapping)
- `statement`: Connection released after each statement
  - Highest concurrency but breaks transactions
  - Rarely used

### Option 2: Managed Pooler Services

#### Supabase Pooler

Supabase provides two connection strings:

```bash
# Direct connection (for migrations/admin)
DATABASE_URL=postgres://user@db.project.supabase.co:5432/postgres

# Pooled connection (for app - use this)
DATABASE_URL=postgres://user@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

- Built-in PgBouncer in transaction mode
- No configuration needed
- Free tier: 60 pooled connections
- [Documentation](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

#### Neon

```bash
DATABASE_URL=postgres://user@ep-xyz.us-east-2.aws.neon.tech/main?sslmode=require
```

- Automatic connection pooling (no config)
- Scales to zero (pay-per-use)
- Built-in branching for dev/staging
- [Documentation](https://neon.tech/docs/connect/connection-pooling)

#### Railway

```bash
# Use Railway's provided DATABASE_URL directly
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

- Built-in connection management
- Auto-scales connections based on load
- No external pooler needed

#### Render PgBouncer Add-on

```bash
# Add PgBouncer service in Render dashboard
DATABASE_URL=postgres://user:pass@pgbouncer-xyz.render.com:6432/db
```

- Managed PgBouncer service
- [Documentation](https://render.com/docs/deploy-pgbouncer)

#### AWS RDS Proxy

- Managed pooler for RDS/Aurora
- Auto-scaling connection pool
- Integrates with IAM authentication
- Cost: ~$0.015/hour per vCPU
- [Documentation](https://aws.amazon.com/rds/proxy/)

#### Azure Database for PostgreSQL

- Built-in connection pooling via PgBouncer
- Configure via Azure Portal: "Connection pooling" → "PgBouncer"
- [Documentation](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-pgbouncer)

---

## Monitoring

### Debug Logging

Enable debug logging to see pool initialization:

```bash
LOG_LEVEL=debug npm run start

# Output:
# [DEBUG] Database connection pool initialized
#   poolSize: 5
#   idleTimeout: 20
#   connectTimeout: 10
```

### Database-Level Monitoring

Check active connections:

```sql
-- Active connections by state
SELECT state, count(*)
FROM pg_stat_activity
WHERE datname = 'your_database'
GROUP BY state;

-- Connection limit check
SELECT
  (SELECT count(*) FROM pg_stat_activity) as current_connections,
  (SELECT setting::int FROM pg_settings WHERE name='max_connections') as max_connections;

-- Warn if approaching limit (80%+)
SELECT
  CASE
    WHEN current_connections::float / max_connections > 0.8
    THEN 'WARNING: 80%+ connections used'
    ELSE 'OK'
  END as status,
  current_connections,
  max_connections
FROM (
  SELECT count(*) as current_connections FROM pg_stat_activity
) a, (
  SELECT setting::int as max_connections FROM pg_settings WHERE name='max_connections'
) b;
```

### PgBouncer Monitoring

```bash
# Connect to PgBouncer admin console
psql -h pgbouncer-host -p 6432 -U pgbouncer pgbouncer

# Check pool status
SHOW POOLS;
SHOW STATS;
SHOW SERVERS;

# Key metrics:
# - cl_active: Active client connections
# - cl_waiting: Queued clients (should be low)
# - sv_active: Active server connections (should be < default_pool_size)
# - sv_idle: Idle server connections (reusable)
```

### Recommended Alerts

Set up monitoring alerts for:

- **Critical:** Database connections > 90% of `max_connections`
- **Warning:** PgBouncer `cl_waiting` > 10 (queue buildup)
- **Warning:** Connection pool initialization failures (check app logs)
- **Info:** Average connection duration > 30 seconds

---

## Troubleshooting

### "too many connections" Error

**Symptoms:**

```
ERROR: sorry, too many clients already
ERROR: remaining connection slots are reserved for non-replication superuser connections
```

**Solutions:**

1. **Check current usage:**

   ```sql
   SELECT count(*) FROM pg_stat_activity;
   SELECT setting FROM pg_settings WHERE name='max_connections';
   ```

2. **Reduce pool size:**

   ```bash
   DATABASE_POOL_SIZE=3    # Was 10
   ```

3. **Increase max_connections (requires PostgreSQL restart):**

   ```sql
   ALTER SYSTEM SET max_connections = 200;
   -- Then restart PostgreSQL
   ```

4. **Deploy external pooler** (see PgBouncer setup above)

### PgBouncer Connection Refused

**Symptoms:**

```
psql: error: connection to server at "pgbouncer-host" failed: Connection refused
```

**Solutions:**

1. Verify PgBouncer is running:

   ```bash
   sudo systemctl status pgbouncer
   ```

2. Check logs:

   ```bash
   sudo journalctl -u pgbouncer -f
   ```

3. Test connectivity:

   ```bash
   psql -h pgbouncer-host -p 6432 -U user -d db
   ```

4. Verify firewall allows port 6432:
   ```bash
   sudo ufw allow 6432/tcp
   ```

### Slow Queries After Adding Pooler

**Symptoms:**

- Queries run slower through PgBouncer than direct connection
- Prepared statement errors in logs

**Cause:**
PgBouncer in `transaction` mode prevents prepared statement caching.

**Solutions:**

1. **Use `session` mode** (reduces concurrency):

   ```ini
   pool_mode = session
   ```

2. **Optimize queries** to not rely on prepared statements

3. **Profile slow queries:**
   ```sql
   SELECT query, calls, mean_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

### Connection Pool Exhaustion

**Symptoms:**

- App hangs on database queries
- Timeout errors in logs
- High `cl_waiting` in PgBouncer stats

**Solutions:**

1. **Increase `default_pool_size` in PgBouncer:**

   ```ini
   default_pool_size = 50    # Was 25
   ```

2. **Scale PostgreSQL vertically** (more CPU/memory → handle more connections)

3. **Add read replicas** for read-heavy workloads

4. **Review slow queries** that hold connections too long

---

## Recommended Configuration by Scale

| Scale                | Strategy                   | Config                           | Notes                    |
| -------------------- | -------------------------- | -------------------------------- | ------------------------ |
| **1-10 instances**   | Client-side only           | `DATABASE_POOL_SIZE=10`          | Simple, no external deps |
| **10-20 instances**  | Client-side                | `DATABASE_POOL_SIZE=5`           | Watch connection usage   |
| **20-50 instances**  | External pooler            | PgBouncer `default_pool_size=25` | Prevents exhaustion      |
| **50-100 instances** | External pooler + replicas | PgBouncer + read replicas        | Scale reads horizontally |
| **100+ instances**   | Managed pooler service     | Supabase/Neon auto-scaling       | Let provider handle it   |

---

## Best Practices

1. **Start conservative:** Use `DATABASE_POOL_SIZE=5` for serverless, 10 for containers
2. **Monitor actively:** Set up alerts for connection usage > 80%
3. **Test under load:** Simulate production traffic before launch
4. **Use external pooler early:** Don't wait for "too many connections" errors
5. **Separate admin connections:** Keep one reserved connection for emergencies
6. **Document your setup:** Record pool size decisions for future team members
7. **Review regularly:** Reassess pooling strategy as traffic grows

---

## References

- [postgres-js connection options](https://github.com/porsager/postgres#connection-options)
- [PgBouncer documentation](https://www.pgbouncer.org/config.html)
- [PostgreSQL connection limits](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Vercel Postgres pooling](https://vercel.com/docs/storage/vercel-postgres#connection-pooling)
- [Supabase connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Neon serverless driver](https://neon.tech/docs/serverless/serverless-driver)
