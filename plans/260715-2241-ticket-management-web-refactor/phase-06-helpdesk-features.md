# Phase 06 — Help Desk Core Features

**Priority:** P1 · **Status:** 🟡 in progress (6a, 6-prereq, 6b lookup CRUD done) · **Depends:** Phase 03, 04, 05

## Overview

Build the actual product on the data + routing + UI foundations: auth, admin (RBAC + org data), and the ticketing workflow with realtime, internal notes, attachments, SLA.

## Progress & staging (staged 6a → 6f, one commit group per stage)

Phase 06 is split into stages; each ships committed + green (tsc, unit, eslint, e2e) before the next.

### ✅ 6a — Auth + role-aware nav (DONE, pushed on `develop`)

Commits: `d3afdb0` feat(auth) · `ca198c1` style(ui) · `93e5847` fix(ui) · `caf0466` feat(auth) Turnstile.
Passed a `code-reviewer` pass (DONE_WITH_CONCERNS → H1 config + M1 dark-contrast both fixed).

- **Sign-up:** `useSignUp` + `SignUpForm` (TanStack Form + Zod, `FieldPassword` show/hide toggle), `/auth/sign-up` route, sign-in↔sign-up links.
- **Google OAuth:** `GoogleButton` → `authApi.signInWithGoogle()`; `[auth.external.google] enabled = true` in `config.toml` (creds REQUIRED via `env()` — fast-fails at `supabase start` if unset; see `.env.example`). New Google users get a `profiles` row + `user_roles` = `customer` via the `on_auth_user_created` trigger.
- **Turnstile captcha** (login + sign-up): `@marsidev/react-turnstile`, `[auth.captcha]` enabled, `captchaToken` threaded through `authApi`. Widget renders only when `VITE_TURNSTILE_SITE_KEY` is set → tests/MSW/fresh-checkout run without it. `.env.example` ships Cloudflare always-pass TEST keys for local.
- **Role-aware nav:** sidebar hides the admin group unless `hasPermission('user.manage')` (mirrors the `/admin` route guard).
- **Collapsible sidebar:** `sidebarCollapsed` in the persisted preferences store, navbar toggle, icon rail + tooltips.
- **Design:** `--primary` = brand blue `#0958d9` (lighter in dark for AA); auth pages forced light via a `.light` palette scope (fixed light card design); placeholder illustration (`public/images/auth-illustration.svg`).
- **Structure:** `dashboard.tsx` → `features/dashboard/pages/`.

### ✅ 6-prereq — data-client (VITE_API_MODE branch) + MSW auth — DONE

**Was the blocker for every data screen; now resolved.** The mode switch lives entirely in MSW (feature APIs call supabase-js unchanged in both modes; MSW intercepts the PostgREST HTTP — see `lib/supabase.ts`).

- **Data-client:** `mocks/lib/postgrest-request.ts` parses the supabase-js PostgREST request (eq/in/wfts/ilike, order, offset/limit, single, count) back into `ListParams`; `mocks/handlers/make-table-handler.ts` routes the ticket list through the parity-tested `apply-list-query` and answers with a `Content-Range` count. Registered: `tickets` (list+detail), `profiles`, `roles`, `permissions` (`mocks/handlers/rest-handlers.ts`). Ticket `ApplyListConfig` extracted to `mocks/config/ticket-list-config.ts` (single-sourced with the parity test).
- **MSW auth (extension decided this session):** the free Supabase project sleeps, so the **demo deploys in `msw` mode** — which required mocking auth too. `mocks/handlers/auth-handlers.ts` mocks GoTrue (token password+refresh, signup, user, logout) + the nested `user_roles` permission query the auth store reads; `mocks/lib/fake-session.ts` mints the Session/JWT. Login works with the seeded demo accounts (README). Google button short-circuits to a demo sign-in in msw mode (OAuth can't run static); captcha is off in msw mode.
- **Mode switch = build-time `VITE_API_MODE`** (`msw` = always-on demo, no backend; `supabase` = live). Not a runtime toggle.
- Tests: `postgrest-request.test.ts`, `rest-handlers.test.ts`, `auth-handlers.test.ts`, `e2e/auth-login.spec.ts`. Full suite green (tsc, 70 unit, lint, 8 e2e).

### 🟡 6b Admin CRUD — lookup tables DONE (categories, tags, teams, sla_policies)

Full create/edit/delete for the four bounded lookup tables on a client-side table + dialog form, working in `msw` mode via a new MSW write layer.

- **MSW write layer:** `mocks/lib/table-store.ts` (mutable seeded store + `resetTableStores` wired into test setup); `mocks/handlers/make-table-handler.ts` now serves POST/PATCH/DELETE (opt-in `writable`, so tickets/profiles/roles/permissions stay read-only).
- **Shared UI/logic:** `components/data-table/client-data-table.tsx` (`manualPagination:false`), `components/form/{field-textarea,field-select}` + `components/ui/textarea`, `components/ui/confirm-dialog`, and `features/admin/shared/{use-crud-queries (list+mutations factory), admin-crud-page (generic shell)}`.
- **Entities:** `features/admin/{categories,tags,teams,sla-policies}/**` (schema/keys/api/queries/form-dialog/page) + routes + sidebar nav. i18n namespaces extended (also reconciled a pre-existing yaml↔generated drift).
- Tests: `write-handlers.test.ts` (CRUD over MSW) + `e2e/admin-categories.spec.ts` (in-browser create). Green: tsc, 75 unit, lint, 9 e2e, lang:check.

**Still TODO in 6b:** users (+role assign), roles (+permission matrix), permissions, canned_responses (server-side). Then ⬜ 6c Ticket list · 6d Create/detail · 6e Realtime · 6f Tests.

Per-table pagination (user-confirmed): **users** = server-side (full list contract, like tickets); **roles/permissions/teams/categories/tags/sla_policies** = client-side (fetch-all, `manualPagination:false`, bounded). Realtime/Storage/bulk-RPC = live Supabase only.

### Environment context for a fresh session

- Run app data: needs `supabase start` (via `bun run db:start`; the `supabase` bin is a devDep, no global). Login + permissions are live Supabase.
- To test admin screens: promote your user to `owner` in Studio (`insert into public.user_roles ... where name='owner'`), then re-login.
- Verify commands: `bunx tsc -b`, `bun run test` (43 unit), `bun run lint`, `bun run e2e` (6), `bun run lang:check`. Prettier via lint-staged on commit. Commit subjects must start lowercase (commitlint).

## Requirements

### Auth (Supabase)

- Sign-in / sign-up / sign-out, session restore, OAuth (Google — reuse existing intent).
- RBAC guards already in routing (Phase 04); role-aware navigation.

### Admin

- CRUD via DataTable + Form for: users (+ assign roles), roles (+ permission matrix), permissions, teams (+ members), categories, tags, SLA policies, canned responses.
- **Pagination mode is an explicit per-table decision, not a default:**
  - **Server-side** (full list contract: URL params, debounced search, page reset, `keepPreviousData`): `users`, `canned_responses` — unbounded growth.
  - **Client-side** (fetch-all + in-memory table): `roles`, `permissions`, `teams`, `categories`, `tags`, `sla_policies` — bounded to tens of rows; server paging them is complexity for nothing (YAGNI). Same DataTable, `manualPagination: false`.
  - If a "client-side" table ever exceeds ~200 rows, it moves to server-side — no in-between.

### Tickets

- **List:** DataTable — server-side sort/filter/pagination (typed search params), status/priority/assignee/team/tag filters, saved views, bulk actions (assign, status change).
- **Keyword search (ships here, independent of AI):** debounced 300ms search box over subject+description via the Phase 03 `q` param (Postgres FTS + trgm fallback). This is the baseline search — it must work with `VITE_API_MODE=msw` and with no AI key of any kind. Phase 07's semantic search is an _additional_ mode layered on top ("Smart search" toggle), never a replacement — the demo cannot depend on an AI key to find a ticket.
- **List UX** follows `code-standards.md` → List UX contract in full: URL-as-truth, page→1 reset on filter/search/pageSize change, persisted page size, `placeholderData: keepPreviousData` (no layout jump), distinct empty vs no-results states.
- **Saved views** = named snapshots of the search-param object (Zustand-persisted); applying one navigates to the equivalent URL, so a saved view and a shared link are the same thing.
- **Bulk actions + pagination — decided (industry-standard, per Gmail/GitHub/Zendesk):** selection is **scoped to the current page and clears on page change**. Keyed by `getRowId` (stable ticket id, never row index).
  - The header checkbox selects _this page's_ rows only.
  - When the whole page is selected, show the Gmail-style banner: _"All 20 tickets on this page are selected. **Select all N tickets matching these filters**."_
  - Taking that escape hatch sends the **current filter object to the server** — never a list of N ids. The mutation executes over the query server-side (Supabase RPC), so a 5,000-ticket bulk action is one small request, not a 5,000-id payload that times out.
  - Destructive bulk over rows the user can't see requires a confirm dialog stating the count.
  - Rejected: persisting a selected-id set across pages. It costs `autoResetSelectedRows: false` + out-of-table state, and the user can't verify what they selected off-screen — the reason no major help desk does it.
- **Create:** form (subject, description, priority, category, requester).
- **Detail:**
  - Message timeline: `public_reply` vs `internal_note` (RLS-hidden from customers).
  - **Tiptap** rich text composer; **file attachments** drag-drop → Supabase Storage.
  - Assignment (agent/team), status/priority workflow, tags, category.
  - **SLA countdown** (first-response / resolution due), breach warning.
  - Activity timeline from `ticket_events`.
- **Realtime:** live ticket/message updates + **presence** (which agents viewing) via Supabase Realtime.
- **Realtime vs the paginated list — decided:** a realtime event **never splices rows into the list cache**. A page is a server-computed window over sort+filter+offset; inserting locally guesses the server's job and instantly desyncs `totalCount`/`pageCount`, or drops in a row that doesn't belong on this page.
  - **Quiet refetch** (invalidate the list query) only when it's safe: user on page 1, default sort, tab focused, no active selection, not mid-fetch (`isPlaceholderData` false).
  - **Otherwise show a "N new tickets" pill** at the top of the table; refetch only when clicked. The ground never shifts under the cursor — the Twitter/GitHub/Slack pattern.
  - **Throttle invalidation ~1–2s.** A busy help desk fires events in bursts; one refetch per event is a request storm.
  - **Ticket detail is the opposite** and that's correct: the message timeline is append-only, unpaginated, and time-ordered, so splicing a new message straight in is the expected behavior.
- Mutations optimistic + invalidate; every state change writes a `ticket_event`.

## Related code files

- Create: `src/features/auth/**` (rewired), `src/features/admin/**` (rebuilt on DataTable/Form), `src/features/tickets/**` (list/create/detail/components/hooks/schemas), `src/features/tickets/hooks/use-ticket-realtime.ts`, `src/lib/storage.ts`.
- **`src/features/dashboard.tsx` → `src/features/dashboard/`** — it is the one feature that is a
  bare file while `auth/` and `admin/` are folders, so `features/` currently contradicts the
  structure the standards describe. Fold it into the closed sub-folder set (`pages/` at minimum)
  while this phase is touching the feature tree anyway.
- **i18n feature namespaces land here** (`common`/`auth`/`admin`/`tickets`) — deferred from
  Phase 01 by decision: the split rewrites every `t()` call site, and Phase 05 deletes the antd
  components holding most of them, so doing it earlier meant rewriting the same call sites twice.
  This is the phase that finally adds `tickets` copy, so the namespace has content to hold.
  Keep the YAML→TS `lang:gen` flow and the `lang:check` locale-parity gate.

## Implementation steps

1. Wire Supabase auth flows + role-aware nav.
2. Rebuild admin CRUD screens on DataTable + Form (server-side for users/canned responses; client-side for the bounded lookup tables).
3. Ticket list: typed filters + debounced keyword search + sort + pagination (`useQuery` + `keepPreviousData`), empty/no-results states, saved views, bulk actions.
4. Ticket create form.
5. Ticket detail: timeline, Tiptap composer, attachments, assignment, status/priority, tags, SLA countdown, activity.
6. Realtime subscription + presence.
7. Ensure event log written on every mutation; optimistic updates.
8. Unit + e2e tests for happy paths.

## Todo

- [x] Supabase auth + role-aware nav (6a — sign-up, OAuth, Turnstile, collapsible sidebar)
- [ ] Admin CRUD (users/roles/perms/teams/categories/tags/SLA/canned) + per-table pagination mode documented
- [ ] Ticket list (filters, keyword search, sort, pagination, saved views, bulk actions)
- [ ] List UX contract verified: page reset, persisted page size, no layout jump, empty vs no-results
- [ ] Ticket create
- [ ] Ticket detail (timeline, Tiptap, attachments, assign, workflow, SLA, activity)
- [ ] Bulk actions: page-scoped selection + "select all matching filters" (filter → server RPC, RLS re-checked)
- [ ] Realtime updates + presence (list = pill/quiet-refetch + throttle, never splice; detail = splice)
- [ ] Event log + optimistic mutations
- [ ] Tests (unit + e2e happy paths)

## Success criteria

Full ticket lifecycle works across roles; customer cannot see internal notes; realtime reflects other users; SLA timers correct. Keyword search finds a seeded ticket by a word in its description with no AI key present; a filtered+searched+paged list URL is shareable and restores exactly; filtering while on page 7 lands on page 1 with results (not an empty page).

## Risks

- Realtime + optimistic update reconciliation — dedupe by id, reconcile on server echo.
- Storage RLS + signed URLs for attachments.
- **Server-side bulk-by-filter is powerful and unforgiving:** the RPC must re-apply the caller's RLS + permission checks, not trust the filter it was handed. "Select all matching" run by a customer must never touch another customer's tickets. Test it per role.
