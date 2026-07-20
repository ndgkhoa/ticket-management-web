# Code Standards & Frontend Patterns

The review checklist for this repo. Every rule here is either **enforced** by tooling
today or **target** for a phase that hasn't landed — each section says which, because a
standard that quietly describes a future state is indistinguishable from one nobody
follows.

## What is enforced mechanically today

| Rule                                                      | Enforced by                                              |
| --------------------------------------------------------- | -------------------------------------------------------- |
| Conventional commits (scope required; types + max length) | `commitlint` on `commit-msg`                             |
| Lint + format on staged files                             | `husky` pre-commit → `lint-staged`                       |
| Import order, no duplicate/circular imports               | `import-x/*` (ESLint)                                    |
| Type-only imports marked explicitly                       | `@typescript-eslint/consistent-type-imports`             |
| `config/`, `lib/`, `utils/` dependency direction          | `no-restricted-imports` (ESLint, per-directory)          |
| Baseline a11y (incl. `img` alt text)                      | `jsx-a11y` (ESLint)                                      |
| Unknown `t()` keys fail the build                         | `src/types/i18next.d.ts` augmenting `CustomTypeOptions`  |
| `en` / `vi` locale parity + correct plural categories     | `bun run lang:check`                                     |
| Env vars validated at boot                                | Zod schema in `src/config/env.ts`                        |
| Unit + component tests, coverage floor                    | `bun run test:cov` (Vitest) — CI, every push and PR      |
| WCAG 2.1 AA in a real browser                             | `@axe-core/playwright` — CI, on PRs                      |
| App boots and runs (not just compiles)                    | Playwright e2e against the production build — CI, on PRs |
| Reproducible installs                                     | committed `bun.lock` + `bun install --frozen-lockfile`   |

**The CI rows report; they do not yet block.** `develop` has no branch protection, so a
red check leaves the Merge button live and a direct push lands regardless. Enabling
required status checks is what converts those rows from a smoke alarm into a lock — see
the testing phase's success criteria for the exact command and why it is deferred.

Everything else below is convention, and is checked in review until a phase makes it
mechanical.

## Naming

- **Files/dirs:** kebab-case, descriptive (`use-ticket-list.ts`, not `hooks.ts`). **No
  exceptions for entry files** — `app/app.tsx`, not `App.tsx`. The rule is worthless if the
  root files break it. The kebab file name need not match the exported symbol 1:1:
  `main-layout.tsx` exports `MainLayout`.
- **Variables/functions:** camelCase. **Components/Types/Interfaces:** PascalCase — the
  _symbol_, not the filename: `export function TicketTable()` lives in `ticket-table.tsx`.
- **Components are function declarations**, not arrow consts: `export function Foo()` /
  `function Foo() {}` + `export default Foo`. It matches the React + shadcn convention,
  hoists, and gives named stack traces. Arrow functions are for callbacks, handlers and
  inline props; a memoised component keeps the wrapper with a named function expression:
  `export const Foo = memo(function Foo() {})`.
- **Folders:** a collection of peers is plural (`errors`, `fallbacks`, `icons`, `layouts`,
  `pages`, `schemas`, `hooks`); a single cohesive subsystem or uncountable noun is singular
  (`ui`, `form`, `data-table`, `api`, `config`, `lib`).
- **Constants:** UPPER_SNAKE for true constants.
- Boolean names read as predicates: `isLoading`, `hasPermission`, `canAssign`.
- Leaked backend PascalCase fields (`Id`, `AccessToken`, `User`) map to camelCase at the
  API boundary. _Status: target — the current `Id`/`TotalRecord` shapes come from the
  legacy API and are renamed with the Phase 03 data models, not piecemeal._

## Commit Conventions

**`commitlint` enforces** (via `commitlint.config.js`):

- **Scope required:** Every commit MUST have a scope (`scope-empty: never`). Bare `feat:`, `fix:`, etc. are rejected. Example: `feat(auth): add Google OAuth` ✅ vs. `feat: add Google OAuth` ❌
- **Type enum:** `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `revert`, `style`
- **Subject max length:** 100 characters
- **Examples:**
  - `feat(tickets): add semantic search`
  - `fix(auth): resolve JWT expiry edge case`
  - `docs(deployment): update Supabase secrets guide`

Failed commitlint blocks the commit; `git commit --amend` to fix.

## Architecture — feature-based

```
src/
  app/                  # application shell — app.tsx (root: providers + router), router.tsx
  routes/               # TanStack Router file-based tree (__root.tsx, _app/, auth/)
  components/ui/        # shared UI primitives
  components/           # shared composed components (layouts, inputs, fallbacks)
  features/<feature>/
    api/                # data access + the query/mutation hooks that wrap it
    schemas/            # Zod schemas + types inferred from them (z.infer)
    hooks/              # non-server-state feature hooks
    components/         # feature components
    pages/              # page components, rendered by a route file
    constants/          # query-key factories, enums
    stores/             # feature-scoped Zustand slice (only if it isn't global)
  config/               # env.ts (Zod-validated), app constants
  lib/                  # configured third-party clients (supabase, query-client, realtime, storage, list-query, route-guards, observability)
  utils/                # pure helpers, zero app deps (cn, format)
  stores/               # global Zustand state (auth session, preferences)
  i18n/, styles/, types/            # global-only
```

**Boundary rules** — these exist because the repo previously had three overlapping buckets:

- `config/` = values (env, constants). `lib/` = _configured instances_ of third-party
  libs. `utils/` = pure functions importing nothing from the app. If a helper needs the
  API client, it belongs in `lib/`, not `utils/`. **Enforced by ESLint.**
- **Env lives in `config/env.ts`** — it is a value, not a client wrapper.
- **Feature sub-folders are a closed set.** Need something that doesn't fit? Extend this
  list in a PR — don't invent a bucket in one feature.
- **Feature groups may nest one level** (`features/admin/users/`), and no deeper.
- **One type folder:** `src/types/` for global-only types; the i18next augmentation lives
  in `src/types/i18next.d.ts`.
- **Barrels only at a feature's public boundary**, to make "no deep cross-feature imports"
  enforceable. No barrel per sub-folder — blanket barrels slow HMR and invite cycles.
  _Status: adopted. File-based TanStack Router (`src/routes/`) has replaced react-router;
  routing is no longer in feature folders. Public API barrels at feature boundaries remain
  a pattern for the future, pending cross-feature import enforcement via ESLint._
- Colocate. Files under ~200 LOC. Split by concern before they grow.

## State: strict separation

- **Server state → TanStack Query only.** Never mirror server data into Zustand.
- **Client/UI state → Zustand only** (auth session, theme, sidebar).
- **URL state → typed search params** (list filters, pagination, sort, search query).
- **One owner per piece of state.** Mirroring is how state drifts: `language` used to live
  in both i18next and Zustand, and a reload restored the store value while i18next stayed
  on its hardcoded default. i18next now owns it outright.
- Exception: `pageSize` is _both_ — a URL param (shareable) with a Zustand-persisted
  default (sticky across visits).

## Data-fetching patterns

- **Query-key factory** per feature: `ticketKeys.all / .list(params) / .detail(id)`.
- **queryOptions factory** shared by hooks + route loaders.
- **Hook choice by shape — not negotiable:**
  - **Single/detail resource → `useSuspenseQuery`** + route-level Suspense/error boundaries.
  - **Paginated list → `useQuery` + `placeholderData: keepPreviousData`.**
    `useSuspenseQuery` drops `placeholderData` by design in v5, so it cannot hold the
    previous page while the next loads — the table would collapse to a fallback and the
    layout would jump on every page change.
- Mutations: **optimistic update + rollback**, then `invalidateQueries`.
- Loaders call `queryClient.ensureQueryData(...)` so data is warm before render.

```ts
// paginated list — previous page stays on screen while the next fetches
import { keepPreviousData, useQuery } from '@tanstack/react-query';

const { data, isPlaceholderData } = useQuery({
  ...ticketQueries.list(search), // search = typed URL params
  placeholderData: keepPreviousData, // v5: NOT the removed v4 `keepPreviousData: true` flag
});
// dim the table + disable "next" while isPlaceholderData — never unmount it
```

## List UX contract (search · filter · sort · pagination)

Every list screen obeys all of it. Reviewers reject partial compliance.

- **URL is the single source of truth.** `page`, `pageSize`, `sort`, `q`, and each filter
  live in typed search params — never in `useState`. A list URL is shareable and survives
  refresh/back.
- **Debounce the search input** before writing to the URL. Keep the input responsive via
  local state; debounce only the URL write + refetch. The debounced setter must be stable
  across renders and cancelled on unmount — rebuilding it per render gives each render its
  own timer, and a re-render mid-typing then lets two writes through.
- **Reset `page` to 1 whenever `q`, a filter, or `pageSize` changes.** Otherwise a user on
  page 7 filters down to 2 pages and lands on an empty page. Enforce centrally in the
  param-update helper, not per call site.
- **Persist `pageSize`** in Zustand preferences. URL wins when present; the store supplies
  the default for a fresh visit. Validate against an allowlist (10/20/50/100) so an
  arbitrary URL value cannot become an unbounded query.
- **Never hide or unmount controls.** No `hideOnSinglePage` — a pagination bar that
  disappears when results fit one page makes the layout jump as the user filters. Disable
  controls; never hide them. Skeleton only on first load; later pages dim via
  `isPlaceholderData`.
- **Three distinct empty states** — they are not the same message:
  - _No data at all_ → onboarding CTA ("Create your first ticket").
  - _No results for the current filters_ → echo the query + a "Clear filters" action.
  - _Error_ → route/table `errorComponent` with retry.
- Server-side sort/filter/pagination is the default for tickets + users. Small fixed
  tables (roles, permissions) may stay client-side — state the choice in the phase.

## Forms

- TanStack Form + Zod schema colocated in `schemas/`; types via `z.infer`. _Status: adopted in
  Phase 05 — the sign-in form uses TanStack Form + Zod + the `FieldText`/`FieldError` family
  (`components/form/`); antd `Form` is gone._
- **Validation lives in the schema, next to the field it guards** — not in a shared bucket of
  patterns. A separate regex file is a second source of truth for validation: reading the form
  no longer tells you the rule.
- **Prefer Zod's built-in formats over a hand-rolled regex.** `z.email()`, `z.uuid()`, `z.url()`,
  `z.e164()` are maintained and handle the edge cases a self-written pattern misses — this repo's
  old email regex accepted `a..b@x.com` and `a@b..com`, both of which `z.email()` rejects.
- **A client-side pattern is a UX hint, never a guarantee.** The server / DB constraint is the
  source of truth. Uniqueness (usernames, codes) can only be checked server-side; a regex cannot
  express it.
- **Do not hand-roll phone validation.** A self-written pattern is correct for one country at one
  moment and breaks when a carrier adds a prefix. Use `libphonenumber-js` and store E.164; if the
  number actually matters, verify it with an OTP instead of a pattern. This repo shipped
  `[3|5|7|8|9]`, where `|` is a literal character inside a character class, so `0|12345678`
  passed as a valid phone number.
- **Never put the `g` flag on a validation regex.** A global regex keeps `lastIndex` between
  calls, so `.test()` returns alternating results for the same input.
- Field-level validation, accessible error messages, disabled/pending states from the form
  store.

## Components

- Prefer composition; presentational vs container separation. Avoid prop drilling.
- **Hooks run before any early return.** A `if (!x) return null` above the hooks changes
  hook order the first time `x` arrives, and React rejects it outright. Guard after the
  hooks.
- Every interactive element keyboard + screen-reader accessible.
- Images: decorative art takes `alt=""`; an image that _is_ the link or button (a logo
  linking home) must carry the accessible name.

## i18n (mandatory)

- **No hardcoded user-facing strings.** All copy via `t('...')`.
- **Type-safe keys:** `src/types/i18next.d.ts` augments i18next from the `en` resource, so
  `t()` autocompletes and unknown keys fail typecheck.
- **`en` is the reference locale** — it is the fallback, so it holds every key.
- **Plurals use i18next `_one`/`_other` with `count`**, never hand-rolled `Role2` keys.
  Define exactly the categories a language selects: `en` has `one`/`other`, `vi` has only
  `other`. `bun run lang:check` fails on a `vi` `_one` key that Intl would never pick.
- **YAML is the source of truth** (`scripts/data/{en,vi}.yaml`); `bun run lang:gen`
  generates the TS bundles. Never hand-edit `src/i18n/locales/**`.
- Every new key lands in **both `en` and `vi`**. Zod validation messages and toast text are
  localized too.
- Language is persisted by the i18next browser detector (localStorage), not mirrored in a
  store.
- Date/number formatting via `Intl` — no date library for rendering dates.
- Namespaces per feature (`common`/`auth`/`admin`/`tickets`). _Status: target — deferred
  to the phase that adds ticket copy, so call sites are rewritten once rather than twice._
- Flat YAML-based i18n: single `translation` bundle with prefixed keys (e.g., `Tickets.NoActivity`), no per-feature namespaces today.

## Observability

Optional Sentry (errors) + PostHog (analytics/replay) via `src/lib/observability/`:

- **SDK isolation:** Heavy SDKs (Sentry, PostHog) behind a single dynamic `import()` in `main.tsx`, guarded by `api_mode === 'supabase' && key set`. Never enter the main bundle nor load in MSW/tests.
- **Reporter bridge:** Light, SDK-free `reportError` no-op by default; `initObservability` registers handlers at startup.
- **PII scrubbing:** Allowlist-based (URLs normalized to `:id`, query strings and element text dropped); replay masks all inputs/text.
- **User sync:** Auth user synced by **id only**, deduped on id.
- **Environment gate:** Set `VITE_SENTRY_DSN` and/or `VITE_POSTHOG_KEY` to enable; absent keys = features stay silent.

## Errors & feedback

- Typed API errors; route-level `errorComponent`. Global toast for mutations.
- No `window.location.href` redirects for auth — use router navigation + guards via `src/lib/route-guards.ts`.

## Testing

- Unit/integration: **Vitest + Testing Library**, network via MSW. Test behaviour, not
  implementation. `*.test.tsx` colocated with the code it covers.
- **Always render through `src/testing/render.tsx`.** It wraps the app's real providers
  and hands out a fresh QueryClient per render — never the app singleton, whose cache
  would leak from one test into the next and let a test pass because an earlier one
  warmed the data. A test file that re-wires its own providers is testing a tree that
  does not ship.
- **A regression test must fail on the unfixed code. Verify that, do not assume it.**
  The first version of the debounce test here passed against the bug it was written
  for: the bug let two writes through rather than corrupting the final value, and the
  assertion checked the final value. A test that cannot fail is documentation wearing a
  green tick.
- **e2e runs against the production build**, not the dev server: Vite bundles with
  Rolldown for `build` and a different pipeline for `dev`, so a bundler-only breakage is
  invisible to a dev-server test.
- **a11y is asserted in a real browser** (`@axe-core/playwright`, WCAG 2.1 AA) — never
  in jsdom. axe cannot evaluate colour contrast without layout: it returns `incomplete`,
  which `toHaveNoViolations` ignores, so unreadable text passes. The first real a11y bug
  in this repo was exactly that.
- **MSW runs with `onUnhandledRequest: 'error'`.** The default only warns, which lets a
  test quietly reach the network — the usual root of a suite that is both slow and
  flaky. A request without a handler should fail and name itself.
- **Coverage thresholds are a ratchet**: set at the level the suite reaches, so CI fails
  on a drop. Raise them when a phase adds code meant to stay; never set a number the
  repo cannot meet, because a permanently red gate is one people learn to ignore.
- **Storybook:** Component story files (`*.stories.tsx`) live colocated with components; Vitest excludes stories; Chromatic tracks visual regressions on every PR (forced MSW mode in `.storybook/main.ts`).

## Dependencies

- Adopt the latest version **only where the ecosystem supports it**. TypeScript is pinned
  to 6.x because `typescript-eslint` peers `typescript >=4.8.4 <6.1.0`; moving to 7 would
  silently disable type-aware linting, which costs more than the version gains. Dependabot
  is configured to ignore TS >= 7 until that resolves.
- A version bump is not done until its **usage** is updated to the current API. Bumping the
  number and leaving deprecated calls is how the previous boilerplate rotted.
- Every dependency must be declared. A package that only resolves because another
  dependency hoisted it into `node_modules` is a phantom dependency and breaks the moment
  its host is removed.

## Git / CI

- Conventional commits (commitlint). lint-staged pre-commit. All CI gates green before
  merge.
- Verify a change by exercising it, not by typechecking it. For Vite 8 (Rolldown), build
  **and** preview — a bundler break can be production-only.
