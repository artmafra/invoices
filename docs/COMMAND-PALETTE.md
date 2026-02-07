# Command Palette

Central command registry with a searchable command palette in the admin UI.

## Key files

- `src/config/commands.registry.ts`
- `src/components/admin/command-palette.tsx`
- `src/components/admin/command-palette-provider.tsx`

## Adding commands

1. Add a command entry to `commands.registry.ts`.
2. Provide a `href` or `action` handler.
3. Use `CommandPaletteProvider` in the admin layout (already wired).

## Permissions

Commands are filtered based on permission checks before display.
