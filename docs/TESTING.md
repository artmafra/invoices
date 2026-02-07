# Testing Strategy

There is no full test suite bundled with the template. These are recommended layers to add.

## Existing checks

- `npm run check:lint`
- `npm run check:types`
- `npm run check:format`

## Suggested additions

- Unit tests for services and utilities
- API route integration tests
- UI smoke tests for critical admin pages

## Infrastructure probes

- `npm run db:check`
- `npm run test:email`
- `npm run test:storage`
- `npm run test:rate-limit`
