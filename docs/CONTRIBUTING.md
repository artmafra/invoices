# Contributing

Thanks for contributing. Please keep changes focused and aligned with the existing architecture.

## Workflow

- Create a feature branch
- Keep commits small and scoped
- Run checks before opening a PR

## Checks

- `npm run check:lint`
- `npm run check:types`
- `npm run check:format`

## Database changes

- Update schema in `src/schema`
- Run `npm run db:generate` and `npm run db:push`

## Docs

- Update `docs/README.md` or related docs when behavior changes
