# UI Patterns

Reusable admin UI composition patterns for consistency.

## Theme System

The color theme uses a modular CSS architecture with HSL fallback and OKLCH modern colors for perceptual uniformity.

### File Structure

```
src/themes/
  fallback.css    - HSL approximations for legacy browsers
  primitives.css  - OKLCH primitive variables (lightness, chroma, hue)
  tokens.css      - Computed semantic tokens using calc() expressions
  mapping.css     - Tailwind 4 auto-generation mappings (@theme inline)
```

### Semantic Color Tokens

**Always use semantic tokens instead of hard-coded colors** (enforced by ESLint):

```tsx
// ❌ Don't use hard-coded color classes
<div className="bg-red-500 text-green-600 border-blue-400">

// ✅ Use semantic tokens
<div className="bg-destructive text-success border-border">
```

**Available semantic tokens:**

#### Base Surfaces
- `background` / `foreground` - Page background and text
- `card` / `card-foreground` - Card backgrounds
- `popover` / `popover-foreground` - Popover/dropdown backgrounds

#### Semantic Colors
- `primary` / `primary-foreground` - Brand/primary actions
- `secondary` / `secondary-foreground` - Secondary actions
- `muted` / `muted-foreground` - Subtle backgrounds and text
- `accent` / `accent-foreground` - Accent backgrounds

#### Status Colors
- `destructive` / `destructive-foreground` - Errors, delete actions (red)
- `success` / `success-foreground` - Success states (green)
- `warning` / `warning-foreground` - Warnings, caution (yellow/orange)

#### Priority Colors
- `priority-low` / `priority-low-foreground` - Low priority items
- `priority-medium` / `priority-medium-foreground` - Medium priority
- `priority-high` / `priority-high-foreground` - High priority (warning color)
- `priority-urgent` / `priority-urgent-foreground` - Urgent (destructive color)

#### Borders & Inputs
- `border` - Default border color
- `input` - Input background color
- `ring` - Focus ring color

#### Sidebar
- `sidebar` / `sidebar-foreground` - Sidebar background
- `sidebar-primary` / `sidebar-primary-foreground` - Sidebar primary items
- `sidebar-accent` / `sidebar-accent-foreground` - Sidebar hover/active
- `sidebar-border` - Sidebar borders
- `sidebar-ring` - Sidebar focus rings

### OKLCH Primitive System

The OKLCH theme uses algorithmic color generation from primitive variables:

**Light mode:**
- `--lightness-base: 1` (lighter surfaces)
- `--lightness-step: -0.02` (negative = darker layers on top)
- `--surface-chroma: 0.01` / `--surface-hue: 240` (subtle blue-gray tint)
- `--primary-chroma: 0.05` / `--primary-hue: 240` (brand colors)

**Dark mode:**
- `--lightness-base: 0.15` (darker surfaces)
- `--lightness-step: 0.04` (positive = lighter layers on top)
- `--surface-chroma: 0.003` (less saturated in dark)

### Extending Colors

To add new semantic tokens:

1. Add HSL approximation to `src/themes/fallback.css`:
   ```css
   :root {
     --custom-token: hsl(240 50% 50%);
   }
   ```

2. Add OKLCH computed value to `src/themes/tokens.css`:
   ```css
   @supports (color: oklch(0% 0 0)) {
     :root {
       --custom-token: oklch(0.55 0.1 240);
     }
   }
   ```

3. Add mapping to `src/themes/mapping.css`:
   ```css
   @theme inline {
     --color-custom-token: var(--custom-token);
   }
   ```

Now `bg-custom-token` and `text-custom-token` classes are auto-generated!

### Browser Support

- **OKLCH**: Safari 15.4+, Chrome 111+, Firefox 113+
- **HSL Fallback**: All browsers (including IE11)
- Modern browsers automatically use OKLCH via `@supports`

## Spacing & Density Tokens

**IMPORTANT:** Always use token-based spacing classes instead of hard-coded Tailwind values (e.g., `px-2`, `gap-4`) to ensure components respond to the user's density preference.

### Available Density Modes

- **Compact** (`data-density="compact"`): 0.9x multiplier - tighter spacing
- **Comfortable** (`data-density="comfortable"`): 1x multiplier - default
- **Spacious** (`data-density="spacious"`): 1.1x multiplier - relaxed spacing

### Token Classes

All token classes automatically scale with the density multiplier.

#### Gap Utilities (flexbox/grid)

```tsx
// ❌ Don't use hard-coded values
<div className="flex gap-2">...</div>

// ✅ Use token classes
<div className="flex gap-gap-sm">...</div>
```

**Available gap classes:**

- `gap-gap-xs` - 4px (compact) → 4.5px (spacious)
- `gap-gap-sm` - 6px → 6.6px
- `gap-gap-md` - 8px → 8.8px
- `gap-gap-lg` - 16px → 17.6px
- `gap-gap-xl` - 24px → 26.4px

Also available: `gap-y-*`, `gap-x-*` variants for row/column-specific gaps.

#### Padding Utilities

```tsx
// ❌ Don't use hard-coded values
<input className="px-3 py-2" />

// ✅ Use semantic token classes (auto-generated from --spacing-* vars)
<input className="px-input-x py-input-y" />
```

**Semantic padding tokens:**

- `px-input-x` / `py-input-y` - Form input padding (12px x 8px base)
- `px-button-x` / `py-button-y` - Button padding (16px x 8px base)
- `p-card` - Card padding (24px base, applies to all sides)
- `p-section` - Section/page padding (32px base, applies to all sides)

**Directional variants:** `px-*`, `py-*`, `pt-*`, `pb-*`, `pl-*`, `pr-*` are all auto-generated for each token.

#### Margin Utilities

```tsx
// ✅ Use token classes for margins
<div className="mt-section mb-card">...</div>
```

Available: `m-card`, `m-section` with all directional variants (`mx-*`, `my-*`, `mt-*`, `mb-*`, `ml-*`, `mr-*`).

#### Space Utilities

```tsx
// ❌ Don't use hard-coded space-y
<div className="space-y-4">...</div>

// ✅ Use token classes
<div className="space-y-space-lg">...</div>
```

Available: `space-y-space-*` and `space-x-space-*` plus `space-card` and `space-section`.

### When to Use Which Token

| Use Case             | Recommended Token                | Example                                          |
| -------------------- | -------------------------------- | ------------------------------------------------ |
| Form field padding   | `px-input-x py-input-y`          | `<Input className="px-input-x py-input-y" />`    |
| Button padding       | `px-button-x py-button-y`        | `<Button className="px-button-x py-button-y" />` |
| Card content padding | `p-card`                         | `<CardContent className="p-card">`               |
| Page/section padding | `p-section`                      | `<div className="p-section">`                    |
| Small component gaps | `gap-space-sm`                   | `<div className="flex gap-space-sm">`            |
| Form field spacing   | `gap-space-md` or `gap-space-lg` | `<form className="space-y-space-lg">`            |
| Section spacing      | `space-y-section`                | `<div className="space-y-section">`              |

### Migration Examples

```tsx
// Before
<div className="flex items-center gap-2 px-4 py-2">
  <Button className="px-3 py-1.5">Save</Button>
</div>

// After
<div className="flex items-center gap-space-sm px-card py-input-y">
  <Button className="px-button-x py-button-y">Save</Button>
</div>
```

```tsx
// Before (badges)
<Badge className="px-2.5 py-0.5">Active</Badge>

// After
<Badge className="px-input-x py-input-y">Active</Badge>
```

### Exceptions: When Hard-coded Spacing is OK

You may use hard-coded Tailwind spacing in these cases:

1. **Fixed-size decorative elements** - Icons, avatars, etc. that shouldn't scale
2. **Layout grids with breakpoint-specific spacing** - Responsive grid gaps that need precise control
3. **Third-party component overrides** - When integrating libraries that require specific spacing
4. **Zero values** - `p-0`, `m-0`, `gap-0` are always fine

Always document exceptions with inline comments explaining why tokens can't be used.

## Cards

- Use `Card`, `CardHeader`, `CardContent` for grouped content.
- Keep actions aligned to the right with button groups.
- Card padding should use `p-card` token.

## Sections

- Use `SectionHeader` components for consistent titles and actions.
- Section padding should use `p-section` token.

## Dialogs and drawers

- Use `Dialog` for quick edits and confirmation flows.
- Use `Drawer` for mobile-friendly forms.
- Dialog/drawer content should use `p-card` or `gap-space-lg` for spacing.
