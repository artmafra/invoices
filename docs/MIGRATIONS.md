# Database Migrations

Drizzle migrations are generated from schema files and applied via drizzle-kit.

## Workflow

1. Update schema in `src/schema`.
2. Generate migration:

```bash
npm run db:generate
```

3. Apply migrations:

```bash
npm run db:migrate
```

## Dev-only shortcuts

- `npm run db:push` - Push schema without migrations (development only)
- `npm run db:studio` - Open Drizzle Studio

## Notes

- Migration files are stored in `drizzle/`.
