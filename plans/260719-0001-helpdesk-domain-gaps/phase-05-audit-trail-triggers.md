# Phase 05 — Full Audit Trail via DB Triggers

**Priority:** P2 · **Status:** ⬜ todo · **Depends:** Phase 01 + Phase 02

## Context

- [Audit report](../reports/from-domain-audit-to-planner-helpdesk-business-logic-report.md) gaps #6 (bulk leaves no trail) + #7 (partial + self-attested)
- `supabase/migrations/20260716120000_extensions_and_enums.sql:29-36` — `ticket_event_type`: `created, assigned, status_changed, priority_changed, commented, tagged` (no team/category)
- `supabase/migrations/20260716120500_row_level_security.sql:338-361` — `ticket_events` insert policy (client writes `actor_id=self`; customer can write `commented`)
- `src/features/tickets/api/ticket-event-api.ts:34-48` — client-written events
- `src/features/tickets/api/ticket-queries.ts:53-90` — create/update mutations emit events client-side
- `src/features/tickets/components/ticket-properties.tsx:44-73` — team/category change silently (no event)
- `src/features/tickets/api/ticket-list-rpcs`/`bulk_update_tickets` — `ticket_list_rpcs.sql:34` — no events

## Overview

The audit trail is partial and self-attested. Team/category changes emit no event (no enum value);
events are client-written with `actor_id = self`; RLS even lets a customer write `commented` rows;
and `bulk_update_tickets` records nothing. "An audit trail whose subject holds the pen is a weak
audit trail" — the RLS migration itself flags this as a floor (`row_level_security.sql:347-351`).

Move event emission into **DB triggers** so the trail is authoritative, complete, and covers bulk.

## Key insights from the audit

- Triggers on the state change itself are the robust design the RLS migration explicitly anticipates
  (`row_level_security.sql:347-351`). They fire once per real change on every write path — single,
  bulk RPC, and system jobs (auto-close from Phase 03).
- The `ticket_event_type` enum lacks `team_changed` / `category_changed` — add them so those changes
  are recordable (audit gap #7).
- Actor identity: a trigger can read `auth.uid()` for user-driven changes; for system changes
  (auto-close sweep) actor is `null`. Store actor from `auth.uid()` inside the trigger, not from a
  client-supplied field — that's what makes it non-forgeable.
- Client event-writing must be **removed** to avoid double events once triggers emit them. This
  touches `ticket-queries.ts` (create/update), `ticket-message-queries.ts` (commented),
  `ticket-properties.tsx` (event plumbing), and `ticket-event-api.ts` (create path).

## Requirements

**Functional**

- DB triggers emit `ticket_events` for: `created`, `status_changed`, `priority_changed`,
  `assigned`, `team_changed`, `category_changed`, and `commented` (on message insert). Meta carries
  `{from,to}` where applicable.
- Bulk changes via `bulk_update_tickets` produce the same events (guaranteed — triggers fire on the
  underlying UPDATE).
- Remove all client-side event writes; the client only reads the timeline.

**Non-functional**

- Trigger fn `SECURITY DEFINER` (writes an append-only table on the caller's behalf, actor pinned to
  `auth.uid()`); tighten `ticket_events` RLS so clients can no longer INSERT at all.
- MSW parity: the mock write/rpc handlers synthesize the same events into the event store.

## Architecture / approach

```
ticket UPDATE ──► AFTER UPDATE trg emit_ticket_change_events()
   diff OLD/NEW per field → insert one event row per changed field (actor := auth.uid())
ticket INSERT ──► AFTER INSERT trg → 'created'
message INSERT ─► AFTER INSERT trg → 'commented' (replaces client write)
```

- Migration `NNNNNN_ticket_audit_triggers.sql`:
  - `alter type ticket_event_type add value 'team_changed'` + `'category_changed'` (enum add is
    non-transactional — separate migration statement / run before use).
  - `emit_ticket_change_events()` (`AFTER INSERT OR UPDATE on tickets`) — one row per changed field.
  - `emit_comment_event()` (`AFTER INSERT on ticket_messages`).
  - Revoke client INSERT on `ticket_events`: replace `ticket_events_insert` policy with none, and
    remove the INSERT grant (`grants.sql`) — reads stay.
- Frontend removals:
  - `ticket-queries.ts` — drop `ticketEventApi.create` calls from create/update mutations.
  - `ticket-message-queries.ts` — drop the `commented` write.
  - `ticket-properties.tsx` — drop the `event(...)` plumbing (status/priority/assigned meta now DB-side).
  - `ticket-event-api.ts` — keep `list`, remove `create` (or mark internal/unused).
- MSW: `rest-handlers`/`rpc-handlers` synthesize events into `ticket-event` store on writes so the
  activity feed still populates in demo/tests.

## Related code files

**Create**

- `supabase/migrations/NNNNNN_ticket_audit_event_types.sql` (enum additions, standalone)
- `supabase/migrations/NNNNNN_ticket_audit_triggers.sql` (triggers + RLS/grant tightening)

**Modify**

- `src/features/tickets/api/ticket-queries.ts` — remove client event writes
- `src/features/tickets/api/ticket-message-queries.ts` — remove `commented` write
- `src/features/tickets/api/ticket-event-api.ts` — remove `create`
- `src/features/tickets/components/ticket-properties.tsx` — remove event plumbing
- `src/mocks/handlers/rest-handlers.ts`, `rpc-handlers.ts` — synthesize events on write
- Tests: workflow + bulk tests assert events now come from writes, not client calls

## Implementation steps

1. Migration A: add enum values `team_changed`, `category_changed` (own migration; enum add can't
   share a txn with its use).
2. Migration B: `emit_ticket_change_events()` + `emit_comment_event()` triggers; drop the client
   INSERT policy on `ticket_events`; revoke INSERT grant.
3. Regenerate `db:types` (enum + any event-type schema pickup via `ticket-enums.ts`).
4. Remove client event writes across the four frontend files.
5. MSW: emit events into the store on ticket insert/update, message insert, and bulk RPC.
6. Tests: single update emits exactly one event per changed field; bulk-solve emits
   `status_changed` per affected ticket; a customer reply emits `commented` (via trigger, not
   client); a customer can no longer INSERT an `assigned` event (RLS denies).
7. Build + `seed:check`.

## Todo

- [ ] Enum: `team_changed` + `category_changed` (standalone migration)
- [ ] `emit_ticket_change_events()` + `emit_comment_event()` triggers
- [ ] `ticket_events` client INSERT policy dropped + grant revoked (read-only for clients)
- [ ] Remove client event writes (ticket-queries, message-queries, ticket-properties, event-api)
- [ ] MSW event synthesis on writes (incl. bulk)
- [ ] Tests: per-field events, bulk events, forbidden client-forged event

## Success criteria

Every status/priority/assignee/team/category change — single or bulk — produces exactly one
authoritative `ticket_event` with the correct actor, written by the DB, not the client. Customers
can no longer forge events. The activity timeline is unchanged visually but now trustworthy.

## Risks

| Risk                                                          | L×I | Mitigation                                                              |
| ------------------------------------------------------------- | --- | ----------------------------------------------------------------------- |
| Double events during rollout (client + trigger both write)    | M×M | Land trigger + client-removal in the same change; test event counts     |
| Enum `add value` in a txn with usage fails                    | M×M | Separate migration for enum additions, before the trigger migration     |
| `auth.uid()` null inside definer trigger for system jobs      | M×L | Allow null actor (system); auto-close events have actor=null by design  |
| MSW no longer matches (events were client-driven in tests)    | M×M | Update mocks to synthesize; fix tests that asserted the old client path |
| Losing the `commented` customer path breaks customer timeline | L×M | `emit_comment_event()` covers all message inserts regardless of role    |

## Security / RLS considerations

- `ticket_events` becomes **read-only to clients**: drop the INSERT policy and revoke the INSERT
  grant (`grants.sql:...` currently `grant select, insert on public.ticket_events`). Only the
  `SECURITY DEFINER` triggers write it — this is the fix for the self-attested trail.
- Triggers pin `actor_id := auth.uid()` internally; a client cannot claim another actor.
- Append-only preserved (still no update/delete policy or grant).

## Next steps

With authoritative events, Phase 06's read-only customer view and any future analytics (prior
plan's Phase 08) can trust the trail.
</content>
