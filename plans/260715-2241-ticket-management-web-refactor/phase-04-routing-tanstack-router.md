# Phase 04 — Routing: TanStack Router

**Priority:** P1 · **Status:** ⬜ todo · **Depends:** Phase 03

## Overview

Migrate from `react-router-dom` v7 + `use-query-params` to **TanStack Router** — type-safe routes, loaders integrated with TanStack Query, `beforeLoad` auth/RBAC guards, and typed search params. Removes 3 deps and a whole class of runtime routing bugs.

## Key insights

- Current `AppRoutes.tsx` uses old `<Routes>` API; `use-query-params` handles URL state — both replaced.
- Route loaders + `queryClient.ensureQueryData` warm data before render (no waterfalls).
- RBAC guard reads permissions from session/store; enforced in `beforeLoad`, redirect unauth to sign-in.

## Requirements

- File-based routing (`src/routes/`) with generated route tree — picked over code-based for the type-safety showcase.
- **Routing lives in exactly two places** (`code-standards.md` → boundary rules): `src/app/router.tsx` builds/configures the router; `src/routes/**` is the file-based tree. **No `src/router.tsx` at the root.**
- **Route files stay thin** — `validateSearch` + `beforeLoad` guard + `loader`, then render a page component imported from the feature's barrel (`features/tickets` → `TicketListPage`). Business logic and JSX belong in `features/*/pages/`, so routes stay a readable map of the app.
- `beforeLoad` guards: auth required, role/permission required per route.

### Typed search params — the list URL contract

The URL _is_ the list state (`code-standards.md` → List UX contract). This phase makes it type-safe.

- **`validateSearch` takes the Zod 4 schema directly** — no adapter. Zod 4 implements Standard Schema, which Router consumes natively:
  ```ts
  export const Route = createFileRoute('/tickets/')({
    validateSearch: ticketSearchSchema, // plain Zod 4 schema
  });
  ```
  **Do not install `@tanstack/zod-adapter`** — it peer-deps `zod@^3` and would drag a second Zod major into the tree. (`zodValidator`/`fallback` in older tutorials is the v3 path; skip it.)
- **One schema, reused by the data layer.** `ticketSearchSchema` is the same Zod object feeding Phase 03's list-query params, so URL and API can't drift:
  ```ts
  const ticketSearchSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .pipe(z.literal([10, 20, 50, 100]))
      .default(20), // allowlist: URL can't request 100k rows
    q: z.string().trim().optional(),
    status: z.array(ticketStatusEnum).optional(),
    priority: z.array(ticketPriorityEnum).optional(),
    assigneeId: z.uuid().optional(),
    sort: z.string().default('created_at'),
    dir: z.enum(['asc', 'desc']).default('desc'),
  });
  ```
  `z.coerce.*` is required — search params arrive as strings. Invalid params must fall back to defaults, never crash the route (Zod `.catch()` where a bad value is survivable).
- **Central param updater** in `src/features/tickets/hooks/use-ticket-search-params.ts` — the _only_ place list params get written:
  ```ts
  navigate({
    search: (prev) => ({
      ...prev,
      ...patch,
      page: resetsPage(patch) ? 1 : (patch.page ?? prev.page),
    }),
  });
  ```
  - Always spread `prev` — a bare object wipes the other filters.
  - **Page auto-resets to 1** when `q`/filters/`pageSize` change. Enforced here so no call site can forget.
  - Search-input keystrokes navigate with `replace: true` (debounced 300ms) — typing must not stack 20 history entries.
- `stripSearchParams` middleware to keep defaults out of the URL (clean `/tickets` instead of `/tickets?page=1&dir=desc`); `retainSearchParams` where filters should survive cross-route nav.
- Route `loader` calls `ensureQueryData(ticketQueries.list(search))` with `loaderDeps: ({ search }) => search` — **without `loaderDeps` the loader won't re-run when search params change** and pagination silently serves page 1 forever.
- Route-level `pendingComponent` + `errorComponent`; integrate with Suspense.
- **Decide the error-boundary split before writing any `errorComponent`.** `react-error-boundary`
  is mounted in `app/provider.tsx` today and no phase mentions it — it is alive and healthy
  (v6.1.2, peers React 19), so it is not going away by accident. Once routes own
  `errorComponent`, two mechanisms cover overlapping ground. Intended split: **route/data errors
  → router `errorComponent`** (it has the route context and reset), **render errors in shared
  shell components outside the route tree → `react-error-boundary`**. Write the rule down; don't
  leave both catching everything.
- Migrate all existing routes (dashboard, auth, admin/*) + new ticket routes.

## Related code files

- Create: `src/routes/**` (thin route files + generated `routeTree.gen.ts`), `src/app/router.tsx`, route guard utils in `src/lib/route-guards.ts`, `src/lib/search-params.ts` (shared coercion helpers + page-reset rule), `src/features/tickets/hooks/use-ticket-search-params.ts`.
- Modify: `src/app/provider.tsx` to mount `RouterProvider`.
- Delete: `src/AppRoutes.tsx`, `src/hooks/use-query-params.ts`, `src/utils/clean-search-params.ts` (superseded by `stripSearchParams`), `use-query-params` + `react-router-dom` + `@types/react-router-dom` + `query-string` deps, `src/features/auth/components/protected-route.tsx` (replaced by guard — note its `allowed?: string`
  prop is declared but never read, a leftover of the dead RBAC chain Phase 01 removed; the new guard
  takes its permission input from the Phase 03 session, don't port the dead prop).
- Gitignore `src/routes/routeTree.gen.ts`? **No** — commit it. CI typechecks without a dev server running, and a missing generated tree fails the build confusingly.

## Implementation steps

1. Install TanStack Router + Vite plugin (route generation) + devtools.
2. Define root route (shell + providers) and layout routes (main/auth).
3. Port routes; add typed search param schemas (plain Zod 4, shared with the data layer) for list pages.
4. Build the central param updater hook (spread-prev + page-reset + replace-on-search) and the `stripSearchParams`/`retainSearchParams` middlewares.
5. Implement `beforeLoad` auth + permission guards; redirect logic.
6. Wire loaders to `ensureQueryData` for detail/list pages — list routes need `loaderDeps: ({ search }) => search`.
7. Remove react-router-dom + use-query-params; fix all imports.
8. Update Playwright/tests for new navigation.

## Todo

- [ ] TanStack Router + Vite plugin + devtools
- [ ] Root/layout routes + providers mounted
- [ ] All routes ported, typed search params (Zod 4 direct, no zod-adapter)
- [ ] Central param updater: spread-prev, page→1 reset, debounced replace-nav
- [ ] stripSearchParams defaults + retainSearchParams
- [ ] beforeLoad auth + RBAC guards
- [ ] Loaders with ensureQueryData + loaderDeps on list routes
- [ ] RRD + use-query-params removed, tests updated

## Success criteria

Type-safe `<Link>`/navigation (compile-time route + params checking); guards block unauthorized routes; no react-router-dom left. Deep-linking a filtered+sorted+paged list URL reproduces the exact same view after refresh; hand-editing a param to garbage falls back to defaults instead of crashing.

## Risks

- File-based route generation config with Vite — follow official plugin setup.
- Search-param serialization parity with old query-string behavior (esp. array filters like `status=open&status=pending`).
- Missing `loaderDeps` on list routes is a silent bug — the page renders fine but never refetches on param change. Cover with a test.
