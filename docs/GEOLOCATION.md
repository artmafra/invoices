# IP Geolocation

Session and login history records include geolocation data resolved from IP addresses.

## Provider

- ip-api.com (free tier)
- Private/reserved IPs return nulls

## Where it is used

- Session creation (`user_sessions`)
- Login history entries
- Activity log snapshot fields

## Key files

- `src/services/geolocation.service.ts`
- `src/services/user-session.service.ts`
- `src/services/login-history.service.ts`
- `src/types/geolocation.types.ts`
