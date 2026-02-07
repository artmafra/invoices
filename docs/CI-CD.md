# CI/CD

Baseline pipeline for linting, type checking, and production builds.

## Suggested stages

1. Install dependencies
2. Lint: `npm run check:lint`
3. Typecheck: `npm run check:types`
4. Format check: `npm run check:format`
5. Build: `npm run build`

## Notes

- Add environment secrets for build-time config if needed.
- Run migrations on deploy (see `docs/MIGRATIONS.md`).
