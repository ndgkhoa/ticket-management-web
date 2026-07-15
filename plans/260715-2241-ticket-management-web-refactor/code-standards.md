# Code Standards & Frontend Patterns

Enforced across every phase. This is the review checklist.

## Naming
- **Files/dirs:** kebab-case, descriptive (`use-ticket-list.ts`, not `hooks.ts`). **No exceptions for entry files** — `app/provider.tsx`, not `AppProviders.tsx`. The rule is worthless if the root files break it.
- **Variables/functions:** camelCase. **Components/Types/Interfaces:** PascalCase (the *symbol*, not the filename: `export function TicketTable()` lives in `ticket-table.tsx`).
- Kill leaked backend PascalCase fields (`Id`, `AccessToken`, `User`) → camelCase at the API boundary (map in the api layer / Zod transform). **Constants:** UPPER_SNAKE for true constants.
- Boolean names read as predicates: `isLoading`, `hasPermission`, `canAssign`.

## Architecture — feature-based
```
src/
  app/                  # application shell — provider.tsx, router.tsx, app.tsx
  routes/               # TanStack Router file-based tree (generated + thin route files)
  components/ui/        # shadcn primitives (owned)
  components/           # shared composed components (data-table, form, layouts)
  features/<feature>/
    api/                # data access (Supabase/MSW) + the query/mutation hooks that wrap it
    schemas/            # Zod schemas + the types inferred from them (z.infer)
    hooks/              # non-server-state feature hooks (use-ticket-search-params, use-ticket-realtime)
    components/         # feature components
    pages/              # page components, rendered by a route file
    constants/          # query-key factories, enums
    stores/             # feature-scoped Zustand slice (only if it isn't global)
  config/               # env.ts (Zod-validated), app constants
  lib/                  # configured third-party clients/wrappers (supabase, query-client, theme, list-query)
  utils/                # pure helpers, zero app deps (cn, format, regexes)
  stores/               # global Zustand state (auth session, preferences)
  testing/              # test setup, render helpers, MSW server/browser wiring
  mocks/                # MSW handlers + fixtures (the mock data source)
  i18n/, styles/, assets/, types/   # global-only
```

**Boundary rules — these exist because the repo currently has three overlapping buckets:**
- `config/` = values (env, constants). `lib/` = *configured instances* of third-party libs. `utils/` = pure functions importing nothing from the app. If a helper needs the supabase client, it's `lib/`, not `utils/`.
- **Env lives in `config/env.ts`** — not `lib/env.ts`. It's a value, and that's where the repo already keeps it.
- **Routing is `app/` + `routes/`, never both plus a stray root file.** `app/router.tsx` builds the router; `src/routes/*` are thin — validate search params, guard, loader, then render a page component imported from a feature. Zero business logic in a route file. No `src/router.tsx` at the root.
- **Feature sub-folders are a closed set.** Need something that doesn't fit? Extend this list in a PR — don't invent a bucket in one feature (that's how `features/tickets/ai/` happens).
- **Server-state hooks live in `api/`**, colocated with the fetcher they wrap (`api/get-tickets.ts` exports `ticketQueries.list` + `useTicketList`). `hooks/` is for everything else. Rationale: a query hook and its fetcher change together — splitting them into `hooks/queries/` + `api/` means every change touches two files, and the old `hooks/queries` + `hooks/mutations` split buys nothing but depth.
- **`schemas/` owns its types.** Types are `z.infer` of a schema, so a separate `types/` per feature is a second source of truth for the same shape. Feature-level `types/` is deleted; `src/types/` stays for global-only types.
- **Feature groups may nest one level** (`features/admin/users/`), and no deeper. Nesting past that (`features/admin/users/hooks/queries/...`) buries files 5 levels down for nothing.
- **`@types/` → `types/`.** One type folder, one naming convention. i18next augmentation lives in `src/types/i18next.d.ts`.
- **Barrels only at a feature's public boundary** (`features/tickets/index.ts`), enforcing "no deep cross-feature imports". **No barrel per sub-folder** — inside a feature, import the file directly. Blanket barrels slow HMR and invite circular imports; the barrel earns its place at the boundary it protects, nowhere else.
- Colocate. Files under ~200 LOC. Split by concern before they grow.

## State: strict separation
- **Server state → TanStack Query only.** Never mirror server data into Zustand.
- **Client/UI state → Zustand only** (auth session, theme, sidebar, filters that aren't URL-worthy).
- **URL state → TanStack Router typed search params** (list filters, pagination, sort, search query, tabs). See the List UX contract below.
- Exception: `pageSize` is *both* — URL param (shareable) with a Zustand-persisted default (sticky across visits).

## Data-fetching patterns
- **Query-key factory** per feature: `ticketKeys.all / .list(params) / .detail(id)`.
- **queryOptions factory** shared by hooks + route loaders: `ticketQueries.list(params)`.
- **Hook choice by shape — not negotiable:**
  - **Single/detail resource → `useSuspenseQuery`** + route-level Suspense/error boundaries. No manual `isLoading` ladders.
  - **Paginated list → `useQuery` + `placeholderData: keepPreviousData`.** `useSuspenseQuery` drops `placeholderData` by design (v5), so it cannot hold the previous page while the next loads — the table would collapse to a fallback and the layout would jump on every page change.
- Mutations: **optimistic update + rollback**, then `invalidateQueries`. Centralize error→toast.
- Loaders call `queryClient.ensureQueryData(...)` so data is warm before render.

```ts
// paginated list — previous page stays on screen while the next fetches
import { keepPreviousData, useQuery } from '@tanstack/react-query'

const { data, isPlaceholderData } = useQuery({
  ...ticketQueries.list(search),          // search = typed URL params
  placeholderData: keepPreviousData,      // v5: NOT the removed v4 `keepPreviousData: true` flag
})
// dim the table + disable "next" while isPlaceholderData — never unmount it
```

## List UX contract (search · filter · sort · pagination)
Every list screen (tickets + admin tables) obeys all of it. Reviewers reject partial compliance.

- **URL is the single source of truth.** `page`, `pageSize`, `sort`, `q`, and each filter live in typed search params — never in `useState`. A list URL is shareable and survives refresh/back.
- **Debounce the search input ~300ms** before writing `q` to the URL. Keep the input responsive via local state; debounce only the URL write + refetch. Use `navigate({ replace: true })` for keystrokes so typing doesn't bury the back button in history.
- **Reset `page` to 1 whenever `q`, a filter, or `pageSize` changes.** Otherwise a user on page 7 filters down to 2 pages and lands on an empty page. Enforce centrally in the param-update helper, not per-call-site.
- **Persist `pageSize`** in Zustand preferences (like theme/language). URL wins when present; the store supplies the default for a fresh visit. `pageSize` is validated against an allowlist (10/20/50/100) — an arbitrary URL value must not become an unbounded query.
- **Never unmount the table between pages.** Skeleton only on first load; subsequent pages dim via `isPlaceholderData`. No layout shift.
- **Three distinct empty states** — they are not the same message:
  - *No data at all* → onboarding CTA ("Create your first ticket").
  - *No results for the current filters/search* → echo the query + a "Clear filters" action.
  - *Error* → route/table `errorComponent` with retry.
- Server-side sort/filter/pagination is the default for tickets + users. Small fixed tables (roles, permissions) may stay client-side — state the choice explicitly in the phase.

## Forms
- TanStack Form + Zod schema colocated in `schemas/`. Single source of truth for types via `z.infer`.
- Field-level validation, accessible error messages, disabled/pending states from the form store.

## Components
- Prefer composition; presentational vs container separation. Avoid prop drilling (context or store).
- shadcn primitives owned in `components/ui`; wrap—don't fork—for feature variants.
- Every interactive element keyboard + screen-reader accessible (Radix gives most of it; verify with jest-axe).

## i18n (mandatory)
- **No hardcoded user-facing strings.** All copy via `t('...')` (i18next). Enforce with an ESLint rule against string literals in JSX where practical.
- **Type-safe keys:** augment `i18next` types from the `en` resource so `t()` autocompletes and fails on unknown keys.
- Namespaces per feature (`tickets`, `admin`, `auth`, `common`) — colocate locale files or keep under `src/i18n/locales/<lng>/<ns>`.
- Every new key added to **both `en` and `vi`**; `lang:gen` keeps them in sync (extend if needed). Zod validation messages + toast text localized too.
- Language switcher persisted (Zustand preference); date/number formatting via `Intl` respecting active locale.

## Errors & feedback
- Typed API errors; route-level `errorComponent`. Global toast (sonner) for mutations.
- No `window.location.href` redirects for auth — use router navigation + guards.

## Testing
- Unit/integration: Vitest + Testing Library, network via MSW. Test behavior, not implementation.
- `*.test.tsx` colocated. a11y assertions with jest-axe on key screens.
- e2e: Playwright happy paths (sign-in, create ticket, reply, assign).

## Git / CI
- Conventional commits (commitlint). lint-staged pre-commit. All CI gates green before merge.
