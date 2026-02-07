# Rate Limiting

Rate limiting protects endpoints from brute force attacks using Redis-backed rate-limiter-flexible.

## Configuration

Required in all environments:

- `REDIS_URL` - Redis connection URL (native redis:// or rediss:// protocol)

Missing Redis causes security endpoints to fail closed with 503 to protect against brute force attacks.

## Limiter types

| Name              | Limit              |
| ----------------- | ------------------ |
| `auth`            | 5/min per IP+email |
| `nextAuthSignin`  | 5/min per IP+email |
| `passwordReset`   | 3/min per IP       |
| `twoFactorResend` | 3/30s per user     |
| `twoFactorVerify` | 5/min per user     |
| `tokenValidation` | 10/min per IP      |
| `adminInvite`     | 10/min per user    |
| `stepUpAuth`      | 5/min per user     |
| `sensitiveAction` | 10/min per IP      |
| `default`         | 60/min per IP      |

## Usage

```ts
import { getClientIp, withRateLimit } from "@/lib/rate-limit";

const ip = getClientIp(request);
const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
if (rateLimitResponse) return rateLimitResponse;
```

## Response behavior

- 429 with `Retry-After` when limited
- 503 with `Retry-After` when limiter is unavailable in production

## Key files

- `src/lib/rate-limit.ts`
- `src/lib/auth/policy.ts` (policy mapping)
