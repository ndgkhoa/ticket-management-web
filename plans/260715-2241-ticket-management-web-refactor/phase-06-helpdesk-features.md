# Phase 06 — Help Desk Core Features

**Priority:** P1 · **Status:** ⬜ todo · **Depends:** Phase 03, 04, 05

## Overview

Build the actual product on the data + routing + UI foundations: auth, admin (RBAC + org data), and the ticketing workflow with realtime, internal notes, attachments, SLA.

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

- [ ] Supabase auth + role-aware nav
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
