# ADR-0002: shadcn/ui Over Ant Design / Material-UI

**Date:** 2026-07-15 | **Status:** Accepted | **Priority:** P1

## Context

Building a design system for a portfolio help desk. Three options:

- **Ant Design (antd):** Feature-complete, polished, large ecosystem, but heavy bundle + locked-in component API
- **Material-UI (MUI):** Google Material Design, widely recognized, but highly opinionated styling (emotion + JSS wrapper)
- **shadcn/ui:** Headless Radix UI + Tailwind, "own the code" philosophy, minimal black box

The help desk needs light/dark mode (Tailwind + next-themes handles this), custom branding (no Material Design lock-in), and readable source code (recruiters will review it).

## Decision

Use **shadcn/ui** as the primary component library, paired with **Tailwind CSS 4** and **Radix UI** primitives.

## Consequences

**Positive:**

- **Own the code:** Components are copied into `src/components/ui/` at init time. No black-box vendor dependency; can customize without waiting for releases.
- **Tailwind-native:** All styling is Tailwind classes, no CSS-in-JS layer. Bundle size is smaller (tree-shaking works) and debugging is straightforward.
- **Dark mode trivial:** Tailwind's `dark:` prefix + next-themes handle theme switching in 10 lines of code.
- **Radix primitives:** Unstyled accessible components (Dialog, Popover, Tabs, etc.); Tailwind is the only styling concern.
- **No design lock-in:** The app looks like your design, not Google's Material Design or Ant's enterprise look. Portfolio projects benefit from custom branding.
- **Recruitment signal:** Shows you understand component composition + Tailwind CSS at depth (not just using Material Design defaults).

**Negative:**

- **Less out-of-the-box:** Some components (Date picker, Range slider, Advanced table) require you to integrate third-party libs (Radix Calendar, Input Range, TanStack Table). Not a blocker, but more assembly required.
- **Smaller community:** Fewer third-party themes + templates vs MUI. You're building the design system yourself.
- **Tailwind required:** If you hate Tailwind, shadcn isn't for you. But Tailwind is a safe bet in 2026 (widespread adoption, stable API).

## Alternatives Rejected

### Ant Design (antd)

- Heavy bundle (~200 KB gzipped for the full library)
- Locked-in Material Design-inspired look (hard to rebrand)
- CommonJS-first (modern builds work, but the ecosystem is older)
- Recruiter sees "I used a design system" not "I built one"
- Right for enterprise CRUD apps, wrong for a portfolio piece

### Material-UI (MUI)

- Opinionated styling (emotion + JSS wrapper over Tailwind)
- Harder to customize without rebuilding components
- Slightly smaller bundle than antd (~80 KB) but still significant
- Recruiter sees "I know Material Design" not "I know CSS"

### Headless-only (Radix only, no shadcn)

- More control, but more work (every component starts from scratch)
- More CSS to write (vs shadcn's Tailwind classes)
- Better for ultra-specialized needs; overkill here

## Implementation

```bash
# Init shadcn/ui in a Vite + Tailwind project
npx shadcn-ui@latest init

# Add components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
```

Components land in `src/components/ui/` and are yours to modify.

```tsx
// Example: custom button with Tailwind classes
import { Button } from '@/components/ui/button';

export function MyButton() {
  return (
    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
      Custom button
    </Button>
  );
}
```

Dark mode via next-themes:

```tsx
// src/app/provider.tsx
import { ThemeProvider } from 'next-themes';

export function Provider({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      {children}
    </ThemeProvider>
  );
}
```

User clicks a toggle:

```tsx
const { theme, setTheme } = useTheme()

<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? '☀️' : '🌙'}
</button>
```

## Metrics

- **Bundle impact:** +25 KB (gzipped) for ~20 common components
  - vs antd: +200 KB
  - vs MUI: +80 KB
- **Custom components:** 5 custom components built (Ticket badge, SLA card, Triage queue, etc.)
  - All Tailwind, no CSS files
- **Dark mode:** Implemented in 1 component (<20 LOC)
- **Build performance:** Tree-shaking removes unused shadcn components (each is independent)

## Design System Evolution

Start with shadcn primitives, add custom layers:

```
src/components/
  ui/                    # shadcn originals (button, dialog, etc.)
  ├── button.tsx
  ├── dialog.tsx
  └── ...

  composed/              # Custom helpers (not shadcn)
  ├── ticket-badge.tsx
  ├── sla-card.tsx
  └── triage-queue.tsx

  layouts/               # Page structure
  ├── main-layout.tsx
  └── admin-layout.tsx
```

As the design system matures, establish a theme tokens file (`src/config/theme.ts`) for colors, spacing, typography.

## Related Decisions

- **ADR-0001** (TanStack Router): Type-safe forms use shadcn inputs + TanStack Form
- Forms are colocated with Zod schemas; no separate form library (shadcn provides unstyled inputs, TanStack Form handles state)

## Further Reading

- [shadcn/ui docs](https://ui.shadcn.com)
- [Radix UI primitives](https://www.radix-ui.com)
- [Tailwind CSS 4 docs](https://tailwindcss.com)
