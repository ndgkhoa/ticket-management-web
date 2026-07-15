# Phase 05 — Design System: shadcn/ui

**Priority:** P1 · **Status:** ⬜ todo · **Depends:** Phase 01 (UI-independent of 03/04)

## Overview

Replace Ant Design with an owned **shadcn/ui + Tailwind 4** design system: primitives, DataTable (TanStack Table), Form (TanStack Form + Zod), toast (sonner), command palette (cmdk), dark mode. Showcased in **Storybook + Chromatic**.

## Key insights

- Antd is removed here — it conflicts with TanStack Table/Form (Phase-level decision).
- `components/ui/*` currently mixes antd wrappers + shadcn-like — consolidate to one shadcn-owned system.
- Finish the dark mode that was commented out in `AppProviders.tsx` (Tailwind + CSS vars, no antd algorithm).
- **Removing antd detonates the phantom `dayjs` dependency.** `dayjs` is not in `package.json`; it resolves today only because antd depends on it. The moment antd leaves, `user-list.tsx` / `role-list.tsx` / `permission-list.tsx` fail to resolve `dayjs` — and the error will look like fallout from the antd removal, not a missing dep. Phase 01 fixes it; **verify it's actually gone before running `bun remove antd`**, because debugging this mid-UI-rebuild costs hours.
- Same class of risk, worth one grep before the removal: antd also carries `rc-*` and `@ant-design/icons`. Any other undeclared transitive import (grep for imports of packages absent from `package.json`) breaks at the same moment.

## Requirements

- shadcn init + Tailwind theme (CSS variables, light/dark), radius/typography tokens.
- Core primitives: button, input, select, dialog, dropdown-menu, popover, tooltip, badge, avatar, tabs, sheet, skeleton, sonner toaster, command (cmdk).
- **DataTable** built on TanStack Table (sorting, filtering, pagination, column visibility, row selection) — reusable across admin + tickets. Full spec below.
- **Form** components bound to TanStack Form + Zod (field, label, error, submit states).
- Theme provider + toggle (Zustand preference), replacing antd ConfigProvider.
- Storybook + Chromatic; stories for each primitive + DataTable + Form.

### DataTable spec — server-driven, URL-controlled

The one component every list depends on. Build it against the `code-standards.md` List UX contract; if it's wrong here, it's wrong on 8 screens.

- **Manual mode — the table computes nothing.** The server already paged/sorted/filtered:
  ```ts
  useReactTable({
    data: rows,
    columns,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: totalCount,                 // from the server; without it pageCount is unknown → controls misbehave
    getRowId: (row) => row.id,            // stable id, not row index — selection must survive paging/reorder
    state: { pagination, sorting },       // controlled, derived from URL search params
    onPaginationChange: /* → navigate({ search }) */,
    onSortingChange:    /* → navigate({ search }) */,
    getCoreRowModel: getCoreRowModel(),   // NO getPaginationRowModel/getSortedRowModel — those are client-side
  })
  ```
  State flows URL → table, never the reverse: handlers write to the URL and the new params flow back down. No `useState` mirror of page/sort — two sources of truth desync.
- **`isPlaceholderData` → dim the table** (`opacity-60 pointer-events-none`) + disable next/prev. Never swap it for a skeleton: same DOM, no layout jump.
- **Skeleton rows only on first load**, matching the real row height and column count so the shell doesn't resize when data lands.
- **Three empty states as explicit props** — `emptyState` (no data → CTA), `noResultsState` (filters/search matched nothing → show query + "Clear filters"), error handled by the boundary above. A single generic "No data" is a review reject.
- **`DataTableToolbar`**: debounced search input (300ms, local state → URL), faceted filter dropdowns, column visibility, active-filter chips with individual + "clear all" removal.
- **`DataTablePagination`**: page-size select (10/20/50/100, writes the Zustand preference + URL), `x–y of N` count, first/prev/next/last. Disable — don't hide — controls at the boundaries so the bar doesn't reflow.
- Accessible: `aria-sort` on sorted headers, `aria-live` polite region announcing "N results", sortable headers as real `<button>`s, visible focus rings.
- Stories cover: loading skeleton, placeholder/dimmed state, empty, no-results, error, wide-content overflow, 100k-count formatting.

## Related code files

- Create: `src/components/ui/**` (shadcn), `src/components/data-table/**` (`data-table.tsx`, `data-table-toolbar.tsx`, `data-table-pagination.tsx`, `data-table-empty-state.tsx`, `data-table-skeleton.tsx`, `use-debounced-value.ts`), `src/components/form/**`, `src/lib/theme.ts`, `.storybook/**`, `*.stories.tsx`.
- Modify: providers (drop `ConfigProvider`/antd `App`), `src/styles/*`.
- Delete: `antd` dep, antd-based wrappers, `src/styles/theme.ts` (antd token theme).
- **Delete alongside antd** (found by the post-Phase-01 src audit — each one is a dep that
  goes orphan the moment antd leaves, and none of them were listed here before):
  - `@ant-design/icons` — **20 files import it.** Phase 01 declared it explicitly (it used to
    be a phantom dep resolving only through antd's own dependency tree, exactly like `dayjs`).
    Icons move to `lucide-react`, which is already a dep.
  - `@ant-design/v5-patch-for-react-19` — only exists because antd v5's static `message`/
    `notification`/`Modal.confirm` render through the React-18 `ReactDOM.render`. No antd, no patch.
  - `lodash` + `@types/lodash` — after this phase there are **zero** usages left:
    `clean-search-params.ts` dies in Phase 04, and `debounce` is replaced by the
    `use-debounced-value.ts` this phase creates. Nothing else imports it.
- **`forwardRef` → `ref` as a plain prop.** React 19 deprecated `forwardRef`; 6 files still use
  it (`components/ui/{button,tooltip}.tsx` + the 4 `*-{roles,permissions}-tab.tsx`). The ui ones
  are rewritten as shadcn primitives anyway; the 4 tabs need an explicit pass. Leaving
  `forwardRef` in a React 19 codebase reads as React-18-era code to a reviewer.
- **Client preference storage is this phase's call — `stores/preferences.ts` no longer exists.**
  Phase 01 deleted it (user decision): it had become genuinely dead code once `language` moved to
  i18next, and its only `theme` consumers were commented-out lines. Nothing was lost — rebuild
  whatever shape actually fits, rather than inheriting an empty box. Two needs land here:
  1. **`theme`** — dark mode. shadcn ships **only the CSS** (`.dark` block + vars); its docs are
     explicit that it provides _no_ state management and expects you to write a `ThemeProvider`
     (useState + localStorage + a class on the document root + `matchMedia` for "system").
     So the real choice is **Zustand store vs React Context ThemeProvider**:
     - Zustand keeps `code-standards`' "Client state = Zustand only. No overlap" intact — a
       ThemeProvider adds a second client-state mechanism alongside the auth store.
     - A ThemeProvider follows shadcn's documented path and gets "system" mode for free.
       Pick one and write down why; do not end up with both.
  2. **`pageSize`** — the persisted default behind the List UX contract. URL wins when present;
     the store supplies the default on a fresh visit, so a user who picks 50 rows doesn't re-pick
     it every visit. This one has no shadcn equivalent.
  - Whatever holds it: type it as a union (`'light' | 'dark'`, `10 | 20 | 50 | 100`), not `string`
    / `number`. The deleted store had `theme: string`, so `setTheme('nonsense')` compiled.
  - **Do not spread client state across three localStorage mechanisms** (ThemeProvider's key +
    a hand-rolled `pageSize` key + Zustand's). That is the exact shape of the two bugs Phase 01
    fixed: the `language` mirror desync, and two stores sharing one `local-storage` key.
- **Avoid the dark-mode FOUC.** A Vite SPA paints `index.html` before React mounts, so a reload in
  dark mode flashes light while JS loads and the store/provider rehydrates — Zustand persist and
  shadcn's `useEffect`-based ThemeProvider both have this. Fix it with a tiny inline script in
  `index.html` that reads the stored value and sets the class on `<html>` **before** React runs.
  (`next-themes` does this for you on Next; on Vite it is manual.) Verify by hard-refreshing in
  dark mode — it never shows up in normal dev navigation.

## Implementation steps

1. shadcn init + Tailwind theme tokens + dark mode via CSS vars + theme store.
2. Generate/own core primitives; wrap for project variants (don't fork).
3. Build reusable DataTable (manual pagination/sorting/filtering, URL-controlled, placeholder-dimming, 3 empty states, debounced toolbar search, page-size preference) + Form (TanStack Form + Zod).
4. Replace antd usages screen-by-screen. **Before `bun remove antd`:** confirm no file imports a package that isn't in `package.json` (`dayjs` is the known one — Phase 01 should have handled it; verify, don't assume). Then remove `antd` + `notification` util → sonner, and typecheck + **production build** (not just `dev` — resolution differs).
5. Set up Storybook + Chromatic; author stories + visual regression baseline.
6. Add Chromatic job to CI.

## Todo

- [ ] shadcn init + Tailwind theme + dark mode — decide Zustand store vs ThemeProvider (one, not
      both), union-typed, `pageSize` default persisted, **no FOUC on hard refresh**
- [ ] Core primitives owned
- [ ] Reusable DataTable — manual pagination/sorting/filtering, URL-controlled, `getRowId`, `rowCount`
- [ ] Toolbar: debounced search (300ms), faceted filters, filter chips, column visibility
- [ ] Pagination bar: page-size select (persisted preference), `x–y of N`, boundary-disabled controls
- [ ] Empty / no-results / skeleton / placeholder-dimmed states
- [ ] Reusable Form (TanStack Form + Zod)
- [ ] antd fully removed — **plus its orbit**: `@ant-design/icons` (20 files → lucide-react),
      `@ant-design/v5-patch-for-react-19`, `lodash` + `@types/lodash`
- [ ] `forwardRef` gone — `ref` passed as a normal prop (React 19)
- [ ] **No Vietnamese string literals left in `src/`** — the audit found 8 outside the locale
      files (`notification.ts`, `confirmation-button.tsx`, `permission-form.tsx`,
      `update-user-roles-modal.tsx`). They are scattered and no lint rule catches them, so make
      it a done-check: grep `src/` for Vietnamese diacritics, expect 0 hits outside `i18n/`.
- [ ] Storybook + Chromatic + CI job

## Success criteria

Zero antd imports; consistent themed light/dark UI; Storybook deployed; Chromatic gates visual regressions. **DataTable proves the list contract in Storybook:** paging between pages produces no layout shift (Chromatic diff limited to row content), and empty vs no-results render distinct messaging.

## Risks

- Rebuilding complex inputs (date picker → react-day-picker) — budget time.
- Chromatic snapshot flakiness — stabilize with deterministic data.
- DataTable is used by ~8 screens — over-fitting it to tickets makes admin tables awkward. Keep server-fetching _outside_: it takes `rows`/`totalCount`/state + handlers as props, and owns no queries.
