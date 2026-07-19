# Phase 02 — Triage Queue + Auto-Route + Team-Membership UI

**Priority:** P1 · **Status:** ✅ done · **Depends:** none (team UI unblocks routing value)

## Context

- [Audit report](../reports/from-domain-audit-to-planner-helpdesk-business-logic-report.md) gaps #2 (invisible new tickets) + #3 (no auto-routing)
- `supabase/migrations/20260716120400_ticket_core.sql:142-166` — `can_access_ticket()` (the one visibility definition)
- `supabase/migrations/20260716120200_organization_and_classification.sql:9-17` (`team_members`), `:42` (`is_team_member`)
- `supabase/seed.sql:259-264` (agent role grants — no `ticket.read.all`), `:327-341` (team_members seed-only)
- `src/features/admin/teams/api/team-api.ts` — team CRUD only, **no membership management**
- `src/features/tickets/api/ticket-api.ts:170-172` — create sets `assignee=null, team=null`

## Overview

New customer tickets are invisible to agents. A new ticket has `assignee=null, team=null`; the
`agent` role lacks `ticket.read.all` (`seed.sql:259-264`) and `can_access_ticket()` only grants
own/team rows — so a brand-new ticket is seen only by requester + admin/owner until an admin
hand-assigns it. Real desks make the **unassigned/new queue** the agent's main workspace.

This phase does **both** confirmed directions: (a) open a triage queue by extending visibility,
and (b) auto-route category→team on create. It also adds the missing **team-membership UI**.

"Admin manually assigns everything" is an **oversight being fixed**, not a deliberate design.

## Key insights from the audit

- `can_access_ticket()` is the single definition shared by SELECT/UPDATE/DELETE — extend it once
  and every path (list, detail, update) inherits the triage rule. Do not restate it per policy.
- **`team_members` is load-bearing but has no management UI.** It backs `is_team_member()` →
  `can_access_ticket()` (`ticket_core.sql:163`) and the `profiles_select` roster branch
  (`row_level_security.sql:72-79`), yet the only writes are in `seed.sql:327-341`. In a real
  deploy you cannot add an agent to a team → that agent never sees team tickets (the seeded
  ticket titled _"New agent cannot see any tickets"_ is this exact bug, self-described). Team-based
  routing is meaningless until this UI exists.
- Auto-route needs a category→team mapping; `categories` has none today
  (`organization_and_classification.sql:19-23`). Add `categories.default_team_id`.

## Requirements

**Functional**

- **Triage visibility (a):** an agent holding `ticket.read.team` may also read tickets that are
  **unassigned AND unteamed** (the triage queue). Extend `can_access_ticket()`.
- **Auto-route (b):** on ticket create, if the chosen category has a `default_team_id`, set the
  ticket's `team_id` to it (only when the client didn't already provide a team). DB trigger so it
  covers every create path.
- **Team-membership UI:** in `src/features/admin/teams/`, a screen/dialog to view a team's agents
  and add/remove members (writes `team_members`). Only assignable agents (hold `ticket.update`)
  are addable — reuse `assignable_agents()` (`ticket_list_rpcs.sql:9`).
- **Triage queue UX:** a saved/default list filter (e.g. `assignee=none & team=none`) surfacing the
  queue in the tickets list — no new list contract, reuse the existing URL-as-truth filters.

**Non-functional**

- Membership writes gated by `team.manage` (RLS `team_members_write` already requires it —
  `row_level_security.sql:156-159`). No RLS change needed for membership.
- MSW parity: mock the auto-route trigger and add a `team_members` mock store + handlers.

## Architecture / approach

```
create ticket ──► BEFORE INSERT trg (auto-route) ──► team_id := category.default_team_id when null
agent lists   ──► tickets_select RLS ──► can_access_ticket() now also matches unassigned+unteamed
admin team UI ──► team_members insert/delete (RLS: team.manage)
```

- Migration `NNNNNN_ticket_triage_visibility.sql`: `alter function can_access_ticket` to add the
  triage branch `(has_permission(uid,'ticket.read.team') and ticket_assignee_id is null and
ticket_team_id is null)`.
- Migration `NNNNNN_category_default_team_routing.sql`: add `categories.default_team_id uuid
references teams(id) on delete set null`; trigger `route_ticket_on_create()` (`BEFORE INSERT`).
- Frontend team membership: extend `src/features/admin/teams/` with `api/team-member-api.ts` +
  queries, a members section in `team-form-dialog.tsx` (or a new `team-members-dialog.tsx`).
- Category admin: add a team picker to the category form (locate existing
  `src/features/admin/categories/**`).
- Tickets list: add a "Triage / Unassigned" quick filter (constants + list filter option).

## Related code files

**Create**

- `supabase/migrations/NNNNNN_ticket_triage_visibility.sql`
- `supabase/migrations/NNNNNN_category_default_team_routing.sql`
- `src/features/admin/teams/api/team-member-api.ts` (+ queries) — list/add/remove members
- `src/features/admin/teams/components/team-members-dialog.tsx`
- `src/mocks/stores/team-members-store.ts`

**Modify**

- `src/features/admin/teams/pages/teams.tsx` — entry point for managing members
- `src/features/admin/categories/**` — category form gains a default-team picker
- `src/features/tickets/constants/*` + list filter UI — triage quick filter
- `src/mocks/handlers/rest-handlers.ts` — `team_members` handler + auto-route on ticket insert
- `src/mocks/handlers/rpc-handlers.ts` — reuse `assignable_agents` for the member picker
- Tests: team-membership CRUD, auto-route on create, triage visibility

## Implementation steps

1. Migration: extend `can_access_ticket()` with the triage branch. Verify the update/delete
   policies inherit it (they call the same function) and that a customer still sees only own rows.
2. Migration: `categories.default_team_id` + `route_ticket_on_create()` trigger (skip when
   `team_id` already provided). MSW: mirror in the ticket insert handler.
3. Backend membership already allowed by RLS; build `team-member-api.ts` (insert/delete on
   `team_members`) + queries.
4. Team UI: members dialog listing current members + an add picker sourced from
   `assignable_agents()`; remove action. Guard behind `team.manage`.
5. Category UI: add default-team select to the category form.
6. Tickets list: triage quick filter (`assignee_id=none`, `team_id=none`).
7. MSW: `team-members-store` + handlers; auto-route + triage filtering in mock reads.
8. Tests + `db:types` + build.

## Todo

- [x] `can_access_ticket()` triage branch (unassigned + unteamed visible to `ticket.read.team`)
- [x] `categories.default_team_id` + `route_ticket_on_create()` trigger
- [x] `team-member-api.ts` + queries (list/add/remove on `team_members`)
- [x] Team-members management dialog (add/remove agents; RLS `team.manage`-gated)
- [x] Category form default-team picker (+ seeded category→team defaults)
- [x] Tickets list triage/unassigned quick filter (shared `FILTER_IS_NULL` sentinel; live `.is()`)
- [x] MSW: team_members store/handler + auto-route + `is.null` applier parity
- [x] Tests: membership CRUD, auto-route, triage filter (MSW); triage visibility + customer own-only verified live via `can_access_ticket`

Verified live (local DB): triage visibility 4/4, auto-route trigger sets team from category default, and bulk-triage scope (affected 32 = unassigned+unteamed, not all 500). Note: live categories need `bun run db:reset` to load the seeded defaults (the column was added empty by `migration up`).

**Post-review fix:** `bulk_update_tickets` ignored the triage filter, so "select all matching" in triage mode would have mutated every accessible ticket — added a triage branch to the RPC (migration `..._bulk_update_triage_scope.sql`) + the MSW mock, with a regression test.

**Deferred (low severity, from review):**

- MSW request parser collapses duplicate same-column params (only matters for the contradictory triage + team-facet combo — live PostgREST ANDs them to empty).
- `team_members_write` RLS gates on `team.manage` but not on the added user being an agent (the dialog roster already prevents adding a customer; harmless since a customer gains no visibility from `is_team_member`). Harden with a `has_permission(user_id,'ticket.update')` WITH CHECK when convenient.

## Success criteria

An agent (no `ticket.read.all`) sees unassigned+unteamed tickets in a triage queue. Creating a
ticket in a category with a default team lands it on that team automatically. An admin can add/
remove an agent from a team through the UI, and that agent then sees the team's tickets. A
customer's visibility is unchanged (own tickets only).

## Risks

| Risk                                                                            | L×I | Mitigation                                                                                                 |
| ------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------- |
| Triage branch widens visibility more than intended (e.g. assigned-but-unteamed) | M×H | Require BOTH `assignee is null` AND `team is null`; assert an assigned/teamed ticket is NOT triage-visible |
| Auto-route overrides an explicit agent-chosen team                              | M×M | Trigger only sets `team_id` when null on insert                                                            |
| `default_team_id` FK to a deleted team                                          | L×L | `on delete set null`                                                                                       |
| Membership UI lets non-agents be added to teams                                 | L×M | Source picker from `assignable_agents()` only                                                              |
| Perf: extra OR branch in the hottest RLS predicate                              | L×M | Branch is index-friendly (`is null` on partial-indexed cols); measure on seed size                         |

## Security / RLS considerations

- `can_access_ticket()` stays `stable`, `security invoker` for its own reads; the widened branch
  grants read of the triage queue only to holders of `ticket.read.team` — customers unaffected.
- Membership writes already require `team.manage` (existing `team_members_write`); no grant change.
- Verify the widened visibility does not unintentionally widen UPDATE: an agent can already update
  any ticket they can see (`tickets_update`), so triage-visible now means triage-updatable — this
  is the intended "claim from the queue" behaviour. State it explicitly and test it.

## Next steps

Phase 05 audit triggers will record `assigned`/`team_changed` events for both manual claim and
auto-route. Phase 03 lifecycle builds on the same create/update paths.
</content>
