# Phase 05 — Design System: shadcn/ui

**Priority:** P1 · **Status:** ✅ done · **Depends:** Phase 01 (UI-independent of 03/04)

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

## Progress (5a–5d done)

Staged 5a→5d, one commit per stage. **Decisions taken:** dark mode = **shadcn ThemeProvider**
(Vite guide) not Zustand — user reversed the initial Zustand pick to follow the docs; theme lives
under `vite-ui-theme`, pageSize stays in the Zustand preferences store, FOUC script in index.html
kept. Storybook only, **Chromatic deferred** (needs the user's token).

- [x] shadcn init + Tailwind theme + dark mode — ThemeProvider + ModeToggle (Vite guide), `pageSize`
      persisted, FOUC script verified (no flash on hard refresh).
- [x] Core primitives owned — button, input, select, dialog, dropdown-menu, popover, tooltip, badge,
      avatar, tabs, sheet, skeleton, label, checkbox, command, table, separator, sonner.
- [x] Reusable DataTable — manual pagination/sorting/filtering, URL-controlled, `getRowId`, `rowCount`.
- [x] Toolbar (debounced 300ms search + view options + faceted filter slot), faceted filter (URL-controlled).
- [x] Pagination bar: page-size select (persisted preference), `x–y of N`, boundary-disabled controls.
- [x] Empty / no-results / skeleton / placeholder-dimmed states — 5 DataTable tests prove them.
- [x] Reusable Form (TanStack Form + Zod) — `Field*` family (`FieldText` + `FieldError`).
- [x] **5c — antd fully removed** — plus its orbit: `@ant-design/icons` (→ lucide-react),
      `@ant-design/v5-patch-for-react-19`, `lodash` + `@types/lodash` all removed from `package.json`.
      All antd sites migrated onto shadcn primitives + DataTable; provider dropped antd
      `ConfigProvider`/`App`, `main.tsx` dropped the v5-patch, test harness (`render.tsx`) now wraps
      `ThemeProvider` + QueryClient + Router; `styles/theme.ts` and dead `utils/notification.ts` deleted.
      Tickets page is the flagship DataTable consumer (server-driven paging/sorting, faceted status/priority
      filters, debounced search, distinct empty vs no-results); admin lists use the shadcn Table primitive
      (still non-paginated read-only). Made `DataTableToolbar.table` optional so it works with `DataTable`
      (which owns its table internally).
- [x] **5c — `forwardRef` gone** — verified 0 usages in `src/` (shadcn primitives already avoid it; the
      Phase-01 `forwardRef` sites were removed with the antd wrappers).
- [x] **5c — No Vietnamese string literals in `src/`** — grep for VN diacritics → 0 outside `i18n/`,
      except `sign-in.test.tsx` which legitimately asserts the `vi` translation output (`Đăng nhập`), a
      test of i18n, not a UI literal. not-found/error/loading pages now localised via new i18n keys
      (`Common.Back/BackToHome/Loading/NoResults/ClearFilters`, `Errors.*`).
- [x] **5d — Storybook + stories** — **Storybook 10** (not 9; latest at build time) with the
      `@storybook/tanstack-react` framework (auto-detected — carries the app's Vite config, `~` alias
      and Tailwind plugin). `.storybook/preview.tsx` loads the app's `styles/index.css` + i18next and adds
      a light/dark theme toolbar (toggles `.dark` on `<html>`, mirroring ThemeProvider). Stories are
      **colocated** next to components: Button, Badge, Input, **DataTable** (flagship — Default / Loading
      skeleton / placeholder-dimming / Empty / NoResults, proving the list contract), Form `FieldText`
      (real TanStack Form + Zod, valid + invalid), and the ticket status/priority badge colours (all enum
      values, viewable in both themes). `bun run storybook` / `storybook:build`. Remaining shadcn primitives
      (dialog, select, tabs, tooltip…) can get stories incrementally — the pattern is established. - **addon-vitest + addon-mcp removed** on purpose: addon-vitest rewrote `vitest.config.ts` into a
      Playwright browser-test project (out of scope — visual regression is Chromatic's job, deferred) and
      would make `bun run test` boot a browser; the hand-tuned jsdom config was restored. - **Chromatic deferred** (needs the user's token). Wire-up when ready: `bunx storybook add
    @chromatic-com/storybook` is already done (addon present); add a `CHROMATIC_PROJECT_TOKEN` secret and
      a CI step `bunx chromatic --project-token=$CHROMATIC_PROJECT_TOKEN --build-script-name=storybook:build`
      (PR-only per phase-02 quota rule; the `--build-script-name` flag is needed because the script was
      renamed from Storybook's default `build-storybook` to match this repo's `:`-namespaced scripts). - **Gotcha (environment, not code):** a stray orphaned `.pnp.cjs` in the parent `workspace/personal/`
      (no `package.json`/`yarn.lock` beside it) made esbuild — Storybook's manager builder — switch to Yarn
      PnP resolution and fail. Removed by the user. If Storybook's manager build ever fails to resolve its
      own deps, look for a stray `.pnp.cjs` up the tree first.

### Post-5c polish & conventions (this session)

UX/design polish on the migrated shell + a codebase-wide convention pass (all green: tsc, 43 tests,
eslint 0 errors, 6 e2e, prettier):

- **Shell/UX:** removed the nested double scrollbar (only `<main>` scrolls); separated the dev-only
  Devtools buttons; language + theme controls are now icon toggles (click-to-flip EN⇄VI, light⇄dark),
  same size; dropped the in-app footer (dashboards don't need one); sidebar `tickets` label capitalised
  via a new `Fields.Tickets` key.
- **Logo/branding:** wordmark is now an inline SVG (`components/ui/logo.tsx`) using `currentColor` so it
  stays legible in dark mode; favicons added (`public/favicon-192.png`, `apple-touch-icon.png` + SVG),
  Vite defaults removed; login uses an inline multicolour Google SVG (icons/ folder deleted).
- **Tickets:** colour-coded `TicketStatusBadge`/`TicketPriorityBadge` (enum-typed, light+dark); all four
  list tables gained a row-index (`Fields.Index`) column (page-offset aware on the paginated tickets).
- **Structure:** deleted empty `hooks/` and unused `assets/react.svg`; merged the `app.tsx`/`provider.tsx`
  indirection into a single `app/app.tsx` exporting `App` (rendered by `main.tsx`).
- **Conventions (documented in `code-standards.md`):** components are **function declarations** (converted
  ~24 arrow components; memo uses named function expressions); folders follow plural-collection /
  singular-subsystem; component families unified (`Field*`, `DataTable*`, `*Fallback`, `*Layout`,
  `Ticket*Badge`); `onX` props vs `handleX` local handlers audited clean.

**Open decision for 5c (non-blocking):** re-sorting the tickets list does not reset to page 1 — `sort`/`dir`
are deliberately excluded from `PAGE_RESETTING_KEYS` (Phase 03/04 schema). Server-side sort on the same page
is valid; revisit if a page-1-on-sort UX is preferred.

**Verification (5c):** typecheck, production build (Rolldown — resolution differs from dev), 43 unit tests,
eslint (0 errors), 6 Playwright e2e all green — incl. WCAG 2.1 AA on sign-in + not-found (proving the shadcn
login form meets the contrast the deleted antd `theme.ts` existed to enforce) and boot-with-no-console-errors
(proving the v5-patch removal didn't break runtime).

**Phase 05 complete (5a–5d).** Next is **Phase 06 (help desk features)**, which 5c unblocked. Storybook is
live for the design system; Chromatic is the one deferred piece (needs the user's token — see 5d note).

## Success criteria

Zero antd imports; consistent themed light/dark UI; Storybook deployed; Chromatic gates visual regressions. **DataTable proves the list contract in Storybook:** paging between pages produces no layout shift (Chromatic diff limited to row content), and empty vs no-results render distinct messaging.

## Risks

- Rebuilding complex inputs (date picker → react-day-picker) — budget time.
- Chromatic snapshot flakiness — stabilize with deterministic data.
- DataTable is used by ~8 screens — over-fitting it to tickets makes admin tables awkward. Keep server-fetching _outside_: it takes `rows`/`totalCount`/state + handlers as props, and owns no queries.
