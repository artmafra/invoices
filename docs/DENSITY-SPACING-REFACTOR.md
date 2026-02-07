# Density & Spacing Token Refactor

**Status:** 🟡 In Progress  
**Priority:** High (M)  
**Estimated Scope:** ~40-60 files

## Goal

Enforce consistent usage of tokenized spacing/density scale across all components to make the `data-density` preference work uniformly throughout the application. Currently, only a few primitives respect density tokens while most layouts use hard-coded Tailwind spacing.

## Motivation

From PROJECT_AUDIT.md:

> Density and spacing tokens are inconsistently applied, so the `data-density` preference only scales a few primitives while most layouts stay fixed. Layout wrappers and content components use hard-coded Tailwind spacing. The custom gap/spacing tokens (`--spacing-gap-*`, `--spacing-section`) and height tokens in `globals.css` have minimal adoption, so toggling density yields uneven visuals and future redesigns will require per-component rewrites.

## Approach

### 1. Define Tailwind Spacing Aliases

Create utility classes in `globals.css` or Tailwind config that map to CSS custom properties:

```css
/* Spacing tokens */
.gap-space-xs {
  gap: var(--spacing-space-xs);
}
.gap-space-sm {
  gap: var(--spacing-space-sm);
}
.gap-space-md {
  gap: var(--spacing-space-md);
}
.gap-space-lg {
  gap: var(--spacing-space-lg);
}

/* Padding tokens */
.p-section {
  padding: var(--spacing-section);
}
.px-input-x {
  padding-left: var(--spacing-input-x);
  padding-right: var(--spacing-input-x);
}
.py-input-y {
  padding-top: var(--spacing-input-y);
  padding-bottom: var(--spacing-input-y);
}

/* Margin tokens */
.m-section {
  margin: var(--spacing-section);
}
```

### 2. Add ESLint Rules

Configure ESLint to flag hard-coded spacing outside a whitelist:

- Flag: `px-1`, `px-2`, `py-1`, `gap-1`, `gap-2`, etc.
- Allow: Core primitives that set base values
- Suggest: Token-based alternatives

### 3. Component Migration Strategy

**Priority order:**

1. Shared layout components (Section, PageContainer, Card)
2. Form primitives (Input, Select, Textarea, Button)
3. Status/badge components
4. Admin feature components
5. Modals and dialogs

**Pattern:**

- Replace `px-2 py-1.5` → `px-input-x py-input-y`
- Replace `gap-2` → `gap-space-sm`
- Replace `space-y-4` → `space-y-section`

## Token Reference

Current CSS tokens defined in `globals.css`:

```css
/* Base tokens (compact density) */
--spacing-space-xs: 0.25rem; /* 4px */
--spacing-space-sm: 0.375rem; /* 6px */
--spacing-space-md: 0.6rem; /* 9.6px */
--spacing-space-lg: 1rem; /* 16px */
--spacing-space-xl: 1.5rem; /* 24px */
--spacing-input-x: 0.75rem; /* 12px */
--spacing-input-y: 0.5rem; /* 8px */

/* Scaled for comfortable density via --density-multiplier */
[data-density="comfortable"] {
  --density-multiplier: 1.25;
}
```

## Migration Checklist

### Phase 1: Foundation

- [x] Define comprehensive Tailwind utility classes for all spacing tokens
- [x] Document token usage patterns in `docs/UI-PATTERNS.md`
- [x] Set up ESLint rules to catch hard-coded spacing
- [x] Create migration helper script (optional)

### Phase 2: Core Components

#### Layout Wrappers

- [ ] `src/components/ui/section.tsx` - Replace `px-2 gap-space-sm`
- [ ] `src/components/ui/card.tsx` - Apply padding tokens
- [ ] `src/components/shared/page-container.tsx` - Section spacing

#### Form Primitives

- [ ] `src/components/ui/input.tsx`
- [ ] `src/components/ui/textarea.tsx`
- [ ] `src/components/ui/select.tsx`
- [ ] `src/components/ui/button.tsx`
- [ ] `src/components/shared/field-group.tsx`

#### Status & Badges

- [ ] `src/components/shared/status-badge.tsx` - Replace `px-2.5 py-0.5`
- [ ] `src/components/ui/badge.tsx`

### Phase 3: Feature Components

#### 2FA/Auth

- [ ] `src/components/admin/2fa/backup-codes-modal.tsx` - Code chips `py-1 px-2`
- [ ] `src/components/admin/2fa/setup-2fa-dialog.tsx`
- [ ] `src/components/admin/passkeys/*`

#### User Management

- [ ] `src/components/admin/users/user-form-dialog.tsx`
- [ ] `src/components/admin/users/user-roles-dialog.tsx`
- [ ] `src/components/admin/users/users-table.tsx`

#### Role Management

- [ ] `src/components/admin/roles/role-form-dialog.tsx`
- [ ] `src/components/admin/roles/permissions-tree.tsx`
- [ ] `src/components/admin/roles/roles-table.tsx`

#### Session Management

- [ ] `src/components/admin/sessions/sessions-table.tsx`
- [ ] `src/components/admin/sessions/session-details-card.tsx`

#### Activity Log

- [ ] `src/components/admin/activity/activity-table.tsx`
- [ ] `src/components/admin/activity/activity-details-card.tsx`

#### Content (Games, Tasks, Notes)

- [ ] `src/components/admin/games/*`
- [ ] `src/components/admin/tasks/*`
- [ ] `src/components/admin/notes/*`

#### Settings

- [ ] `src/components/admin/settings/*`

### Phase 4: Modals & Dialogs

- [ ] `src/components/shared/confirm-dialog.tsx`
- [ ] `src/components/shared/search-filter-bar.tsx`
- [ ] All drawer components

### Phase 5: Admin Pages

- [ ] `src/app/admin/(protected)/system/users/page.tsx`
- [ ] `src/app/admin/(protected)/system/roles/page.tsx`
- [ ] `src/app/admin/(protected)/system/sessions/page.tsx`
- [ ] `src/app/admin/(protected)/system/activity/page.tsx`
- [ ] `src/app/admin/(protected)/games/page.tsx`
- [ ] `src/app/admin/(protected)/tasks/page.tsx`
- [ ] `src/app/admin/(protected)/notes/page.tsx`
- [ ] `src/app/admin/(protected)/settings/*`

## Testing Checklist

After migration:

- [ ] Verify compact density scales all components uniformly
- [ ] Verify comfortable density scales all components uniformly
- [ ] Test light/dark theme compatibility
- [ ] Check mobile responsive behavior
- [ ] Verify no visual regressions in core flows
- [ ] Run accessibility audit for spacing/touch targets

## Known Issues & Edge Cases

- Some components may need density-aware breakpoints (e.g., mobile already compact)
- Table components may need special handling to avoid over-spacing
- Code blocks and monospace content might need fixed spacing
- Third-party components (React Query DevTools, etc.) won't adopt tokens

## References

- Original audit: `PROJECT_AUDIT.md` - Design System & Styling Audit
- UI patterns: `docs/UI-PATTERNS.md`
- Token definitions: `src/app/globals.css`
- Tailwind config: `tailwind.config.ts`

## Notes

- This refactor can be done incrementally without breaking changes
- Each component migration should be tested in isolation
- Consider adding visual regression tests (Storybook/Chromatic)
- Document any new token additions in `docs/UI-PATTERNS.md`
