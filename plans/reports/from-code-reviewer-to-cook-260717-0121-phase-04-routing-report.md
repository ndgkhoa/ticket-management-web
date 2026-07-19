# Phase 04 Routing (TanStack Router) — Code Review

Branch develop, range `59f3610..HEAD`. Verified against live local Supabase + e2e.
Legend: **[CONFIRMED]** = executed/reproduced. **[SUSPECTED]** = reasoned from code.

## Verification run (all green)

- `bunx tsc -b` → exit 0. `bun run lint` → clean. `bun run test` → 38 passed / 18 skipped (skips are out-of-scope integration file). `bun run e2e` → 6/6 passed (~6s), incl. unauthenticated→sign-in redirect.
- Live Supabase permission fetch per role **[CONFIRMED]**: admin & owner hold `user.manage`; agent (`ticket.*`, `canned.read`, `message.*.internal`) and customer (`ticket.create` only) do NOT. RBAC data + nested query correct.
- No `react-router-dom` / `use-query-params` / `query-string` residue. `routeTree.gen.ts` git-tracked, prettier-ignored, eslint-ignored.

---

## HIGH

### H1. Transient permission-fetch failure silently locks an admin out mid-session

`auth.ts:88` `fetchPermissions(...).catch(() => new Set())`; `auth.ts:108-110` every `onAuthStateChange` event calls `resolveSession`; `provider.tsx:31-33` `router.invalidate()` on every store change; `route-guards.ts:36-39`.

`autoRefreshToken: true` (`supabase.ts:29`) fires `TOKEN_REFRESHED` in the background (~hourly). Each event → `resolveSession(session)` → `fetchPermissions` → on a transient network blip the `.catch` returns an **empty set**, and `applySession(session, empty)` sets `status='authenticated'` with **zero permissions**. The store-subscribe then calls `router.invalidate()`, re-running `beforeLoad`; on `/admin` `requirePermission('user.manage')` now fails → admin is redirected to `/`. Because `onAuthStateChange` won't re-fire until the _next_ refresh, the admin stays locked out until a manual reload.

Two aggravating factors:

- Empty-on-failure is **indistinguishable** from a legitimately-unprivileged user (customer). The guard cannot tell "fetch failed" from "has no permissions".
- The failure window recurs every refresh cycle for the whole session, not just at login.

The store comment ("must not lock the user out mid-session more than momentarily") overstates the mitigation: nothing retries, and "momentarily" is actually "until the next refresh or a reload."

Recommendation: on fetch failure during an _already-authenticated_ session, **keep the previously-loaded permission set** rather than replacing with empty (or retry with backoff, or surface a distinct `permissions: 'error'` state that guards treat as "don't downgrade"). Only an actual sign-out should clear permissions.

---

## MEDIUM

### M1. Redirect-after-login is collected but never consumed (dead round-trip)

`route-guards.ts:18` builds `redirect({ to: '/auth/sign-in', search: { redirect: pathname } })`; `sign-in.tsx:11-16` declares the `redirect` search schema — but `login-form.tsx:25` `onSuccess: () => navigate({ to: '/' })` **ignores it**. **[CONFIRMED by reading]** A user deep-linking `/tickets?page=3` while logged out is bounced to sign-in with `?redirect=/tickets`, logs in, and lands on `/` — destination lost. Both the guard comment ("preserving where the user was headed") and the route comment ("return them there after login") describe behavior that isn't wired.

Fix: read the validated `redirect` in the sign-in page and pass it to the post-login navigate (or have the `/auth` `redirectIfAuthenticated` honor it). **When wiring, validate it is a same-origin path** (`redirect.startsWith('/')` and not `//`): `signInSearchSchema` currently accepts free-form `z.string()`, so an unguarded `?redirect=https://evil.com` fed to `navigate` is a would-be open-redirect. (TanStack `to` won't match an external URL as a route, so the risk is low today, but validate before this is ever passed to `window.location` or an anchor.)

### M2. One invalid array element drops the ENTIRE filter (silent data-loss)

`ticket-search-schema.ts:38-39` `z.array(enum).optional().catch(undefined)`. **[CONFIRMED]** `parse({ status: ['open','garbage'] }).status === undefined` — the valid `open` is discarded with the bad value, not preserved. The test (`ticket-search-schema.test.ts:32-41`) and the code comment say "dropping invalid **ones**" (per-element), but the behavior is all-or-nothing. Not a security issue (fails _open_ to a broader result set; RLS enforces access), but a silent, surprising filter loss on a hand-edited or stale-shared URL. If per-element survivability is wanted, map each element through `enum.catch(undefined)` and filter nulls; otherwise correct the comment/test to state the whole array is dropped.

### M3. Documented URL contract does not match runtime serialization

`ticket-search-schema.ts:6-19` claims the URL is a clean, hand-editable `?status=open&status=pending`. **[CONFIRMED via memory-router navigate]** the app actually emits JSON-encoded `?status=%5B%22open%22%2C%22pending%22%5D` (`?status=["open","pending"]`) — TanStack's default serializer, not repeated keys. Consequences:

- Repeated-key hand typing with **2+** values happens to parse to an array (works).
- A single hand-typed `?status=open` parses as the **scalar string** `"open"`, which the `z.array` schema rejects → filter silently dropped (`parse({status:'open'}).status === undefined`, **[CONFIRMED]**).
  The app's own single-status filter is fine (it emits `["open"]`), so this only bites hand-editing — but hand-editability is the stated design goal, so either accept a `scalar | array` union (`z.union([enum, z.array(enum)]).transform(a => [].concat(a))`) or fix the comment to describe the real JSON shape.

---

## LOW / informational

### L1. Boot double permission fetch (and it is H1's amplifier)

`auth.ts:101-110` — `getSession().then(resolveSession)` AND `onAuthStateChange`'s `INITIAL_SESSION` both call `resolveSession` on boot → **two** concurrent `fetchPermissions` for the same user every load. Redundant network call. More importantly it widens H1: whichever `applySession` resolves _last_ wins, so if the second fetch fails after the first succeeded, a good permission set is clobbered by empty even on a normal boot. Consider gating INITIAL_SESSION or deduping the two entry points.

### L2. No upper bound on `page`

`ticket-search-schema.ts:23` — `page: '999999999'` passes through unclamped **[CONFIRMED]**. Data layer returns empty rows, so cosmetic only; a `.max()` or clamp-to-last-page is optional polish.

### Page-reset logic — verified correct (no issue)

`tickets.tsx:67-72` + `use-ticket-search-params.ts:13,37`. **[CONFIRMED by trace]** a page click sends only `{page}` ('page' ∉ `PAGE_RESETTING_KEYS`) → no reset; a size change sends only `{pageSize}` → resets to 1. No antd `onChange` path passes both into `setSearch`, so no spurious reset. Behaves as intended.

### loaderDeps — verified correct

`_app/tickets/index.tsx:22` `loaderDeps: ({search}) => search` returns the whole search object; loader re-runs on any param change (no stale page-1). Serialization round-trip confirmed via memory router (`navigate({search:{page:3,...}})` writes `?...&page=3&...` and parses back). No app-facing supabase MSW handlers yet (deferred to Phase 06), so a full `/tickets?page=3` browser deep-link wasn't drivable in e2e, but the structural path is sound.

---

## Positive observations (guard model is solid)

- `provider.tsx:45` withholds `RouterProvider` until `status !== 'loading'` — closes the flash-of-unauthenticated / half-resolved-guard window. **No interleaving found** where a protected route renders before auth resolves via the normal path.
- `applySession` (`auth.ts:40-46`) sets `permissions` and `status` in a **single** `set()`, and `fetchPermissions` is awaited before it — so on the normal path there is genuinely no window where `status==='authenticated'` while `permissions` is still the empty default. (The only breach is the _failure_ path, H1.)
- Sign-out redirect works: SIGNED_OUT → `resolveSession(null)` → `status='unauthenticated'` → `invalidate()` → `requireAuth` redirects. e2e-confirmed for the unauthenticated case.
- `router.invalidate()` on store change does **not** loop: guards `redirect` but never write store state.
- 404 correctly placed outside the `_app` guard (`router.tsx:31`) — bad URLs show not-found to anyone, no auth bounce.
- Error split holds: route/data errors → router `defaultErrorComponent`; the react-error-boundary in `provider.tsx` is an outer backstop for shell render errors. No harmful overlap.
- Test harness (`render.tsx`) gives real router context via an ad-hoc root route + `await router.load()`; the `as unknown as AnyRouter` cast is cosmetic (test-only router isn't the registered one) and hides nothing behavioral. Only one `render` call site and it is awaited — no un-awaited async-render leak.

---

## Unresolved questions

1. H1 mitigation: keep-previous-permissions vs retry-with-backoff vs explicit error state — which fits the product's tolerance for a stale-but-non-empty set? (Keeping previous risks briefly honoring a revoked role; RLS still backstops server-side.)
2. M1/M3: is hand-editable URL a real requirement, or can the docs be corrected to the JSON shape and the effort saved? Confirms whether M2/M3 need code changes or comment fixes.
3. Should single-select filters accept the scalar form (`?status=open`) for hand-editing, or is app-generated-only acceptable?
