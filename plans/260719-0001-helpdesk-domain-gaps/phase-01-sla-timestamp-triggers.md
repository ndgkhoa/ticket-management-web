# Phase 01 — SLA Correctness via DB Triggers

**Priority:** P1 (highest impact) · **Status:** ✅ done · **Depends:** none (keystone phase)

## Context

- [Audit report](../reports/from-domain-audit-to-planner-helpdesk-business-logic-report.md) gap #1 (+ #6, part of #7)
- `supabase/migrations/20260716120300_sla_policies_and_canned_responses.sql` — one policy per priority (unique)
- `supabase/migrations/20260716120400_ticket_core.sql:24-27` — `first_response_at` / `resolved_at` / `due_at` columns, currently write-never
- `src/features/tickets/api/ticket-api.ts:170-177` (create hard-codes nulls), `:196` (update never stamps `resolved_at`)
- `src/features/tickets/api/ticket-message-api.ts:34` (reply never stamps `first_response_at`)
- `src/mocks/stores/ticket-store.ts`, `src/mocks/handlers/rpc-handlers.ts:65` (bulk mock)

## Overview

SLA is cosmetic today: the running app **never writes any SLA timestamp**. `due_at`,
`first_response_at`, `resolved_at`, `sla_policy_id` are set only in seed/mocks. The SLA card
(`ticket-sla-card.tsx`) recomputes display live off the policy, so the demo looks right while
every real ticket shows first-response perpetually pending and resolution never met.

Fix by stamping on the **triggering event**, in the database, so every write path (single,
bulk, message insert) is covered and the values cannot be forged by a client.

## Key insights from the audit

- Values must be stamped on the event that causes them, not trusted from the client payload.
  A `BEFORE INSERT`/`BEFORE UPDATE` trigger sees the transition and is the only place all
  write paths converge — the single-update, the `bulk_update_tickets` RPC, and message inserts.
- `sla_policies.priority` is `unique` (`sla_policies...:11`), so "the policy for this priority"
  is a single-valued lookup — safe to resolve inside a trigger.
- `first_response_at` is **write-once**: "stamped once, when the first public reply from an
  agent lands… a later reply must not move it" (`ticket_core.sql:24`). The trigger must no-op
  if it is already set.
- `resolved_at` is tied to entering `solved`; re-entering `solved` should not overwrite an
  earlier stamp (idempotent), and reopening should clear it (handled in Phase 03 — this phase
  only stamps on the →solved transition).

## Requirements

**Functional**

- On ticket **create**: compute `due_at` (= `created_at` + policy `resolution_mins`) and set
  `sla_policy_id` from the ticket's priority. If priority changes before first response, keep
  behaviour simple (recompute `due_at` only while `resolved_at is null` — see Risks).
- On **first public reply by an agent** (a `ticket_messages` insert where `type='public_reply'`
  and author holds `ticket.update`): stamp `tickets.first_response_at = now()` iff currently null.
- On ticket **update to `status='solved'`**: stamp `resolved_at = now()` iff null.
- **Bulk path consistency**: the same stamping applies when `bulk_update_tickets` moves tickets
  to `solved` — guaranteed automatically because triggers fire on the underlying UPDATE.

**Non-functional**

- Triggers are `SECURITY DEFINER`, `set search_path = ''`, owned by the migration role, so
  stamping is authoritative regardless of the caller's RLS. Stamping columns the caller cannot
  otherwise write is the whole point.
- MSW mock parity: replicate stamping in `src/mocks/**` write/rpc handlers + message store, since
  triggers don't run under MSW.

## Architecture / approach

Data flow (live):

```
create ticket ──► BEFORE INSERT trg ──► set sla_policy_id + due_at from priority
solve ticket  ──► BEFORE UPDATE trg ──► if NEW.status='solved' & OLD≠'solved' & resolved_at null → stamp
agent replies ──► AFTER INSERT on ticket_messages ──► if first public agent reply → UPDATE tickets.first_response_at
```

- New migration `NNNNNN_sla_timestamp_triggers.sql`:
  - `sla_policy_for_priority(p)` helper (SQL, stable) → returns policy id + resolution_mins.
  - `stamp_ticket_sla()` trigger fn on `tickets` (`BEFORE INSERT OR UPDATE`): sets `sla_policy_id`,
    `due_at`, and `resolved_at` on the →solved transition.
  - `stamp_first_response()` trigger fn on `ticket_messages` (`AFTER INSERT`): first public agent
    reply → stamp parent ticket. Uses `has_permission(author_id,'ticket.update')` to distinguish
    an agent reply from a customer reply.
- Frontend cleanup: `ticket-api.ts` create stops sending hard-coded nulls for the four SLA columns
  (let DB defaults/triggers own them); the create insert still lists the columns MSW needs.
- Mock parity: `ticket-store.ts` (or the write handler that inserts tickets) computes the same
  `due_at`/`sla_policy_id`; the message store stamps `first_response_at`; the bulk rpc handler
  stamps `resolved_at` on →solved.

## Related code files

**Create**

- `supabase/migrations/NNNNNN_sla_timestamp_triggers.sql`

**Modify**

- `src/features/tickets/api/ticket-api.ts` — drop hard-coded SLA nulls in `create` (DB owns them)
- `src/mocks/stores/ticket-store.ts` and/or `src/mocks/handlers/rest-handlers.ts` — stamp on insert
- `src/mocks/stores/ticket-message-store.ts` + message write handler — stamp `first_response_at`
- `src/mocks/handlers/rpc-handlers.ts` — stamp `resolved_at` in the bulk mock on →solved
- `src/features/tickets/components/sla-state.ts` — unchanged here; consumes stamps (touched in Phase 04)
- Tests: `src/features/tickets/api/ticket-workflow.test.ts`, `ticket-bulk-update.test.ts`

## Implementation steps

1. Write `sla_policy_for_priority()` + the two trigger functions + triggers in the new migration.
   Guard idempotency: `first_response_at`/`resolved_at` only set when currently null.
2. Grant nothing extra — triggers are `SECURITY DEFINER`; verify ownership bypasses RLS for the
   internal UPDATE in `stamp_first_response()`.
3. Regenerate DB types (`bun run db:types`) so any changed nullability is reflected.
4. Remove hard-coded SLA nulls from `ticket-api.ts` `create`.
5. Mirror the three stampings in the MSW layer (create, message-insert, bulk).
6. Add/extend tests: create stamps `due_at`+`sla_policy_id`; first agent public reply stamps
   `first_response_at` once (second reply doesn't move it); solving (single + bulk) stamps
   `resolved_at`; a **customer** reply does NOT stamp first response.
7. Run `bun run test`, `bun run seed:check`, build.

## Todo

- [x] Migration: `sla_policy_for_priority()` + `stamp_ticket_sla()` + `stamp_first_response()` + triggers
- [x] `first_response_at` / `resolved_at` write-once (idempotent) verified — MSW test + live psql smoke-test
- [x] `ticket-api.ts` create no longer sends SLA nulls
- [x] MSW parity: insert stamps due_at/policy; message stamps first response; bulk stamps resolved_at
- [x] Regression tests incl. customer-reply-does-not-stamp case (single + bulk solve, write-once)
- [x] `seed:check` + build green (`db:types` not regenerated — the migration adds triggers/functions only, no column changes the client consumes)
- [x] Review fix: clamp `created_at` to `now()` so a forged future date can't push `due_at` out
- [x] Verified live: migration applied to local DB; all trigger paths smoke-tested and cleaned up

## Success criteria

A ticket created via the app has non-null `due_at` and `sla_policy_id`. The first agent public
reply stamps `first_response_at` exactly once. Solving a ticket (single or bulk) stamps
`resolved_at`. The SLA card shows met/breached from real stamps, not just live recompute. All
covered by tests that fail against today's code.

## Risks

| Risk                                                                 | L×I | Mitigation                                                                                                                           |
| -------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Priority change after create leaves stale `due_at`                   | M×M | Recompute `due_at` + `sla_policy_id` on priority change while `resolved_at is null`; document that a resolved ticket freezes its SLA |
| MSW parity drifts from trigger logic (two sources of truth)          | M×M | Keep the stamping rule tiny + colocated; a shared comment referencing the invariant; tests assert both paths                         |
| `first_response_at` moved by a later reply (data corruption, silent) | L×H | Idempotent `is null` guard + explicit regression test                                                                                |
| Trigger `SECURITY DEFINER` over-writes rows it shouldn't             | L×H | Scope the internal UPDATE to `where id = NEW.ticket_id and first_response_at is null`                                                |

## Security / RLS considerations

- Trigger functions run `SECURITY DEFINER` with `set search_path = ''` and fully-qualified names
  (same convention as `has_permission`/`is_team_member`). They must only touch the single ticket
  tied to the triggering row — never a broad UPDATE.
- Stamping happens server-side, so a client cannot forge an SLA "met" by sending timestamps; the
  columns should be treated as read-only from the client (create no longer sends them).
- No new grants; append-only message/event guarantees from the RLS migration are untouched.

## Next steps

Unblocks Phase 04 (pause clock needs stamps + `due_at`). Phase 05 audit triggers will co-exist on
the same tables — keep trigger names distinct and ordering irrelevant (BEFORE stamp vs AFTER audit).
</content>
