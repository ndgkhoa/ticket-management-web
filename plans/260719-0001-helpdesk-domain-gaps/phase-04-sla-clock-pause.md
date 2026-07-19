# Phase 04 — Pause SLA Clock During pending/on_hold

**Priority:** P2 · **Status:** ⬜ todo · **Depends:** Phase 01 (needs stamps + `due_at`)

## Context

- [Audit report](../reports/from-domain-audit-to-planner-helpdesk-business-logic-report.md) gap #5
- `src/features/tickets/components/sla-state.ts:16-26` — `due = createdAt + dueMinutes` vs `now`, ignores status
- `src/features/tickets/components/ticket-sla-card.tsx:52-75` — passes raw `now` + `createdAt` into `slaVariant`
- `supabase/migrations/20260716120400_ticket_core.sql:24-27` — SLA columns

## Overview

`pending` and `on_hold` exist precisely to **pause the SLA timer** (waiting on the customer / on a
third party), but `slaVariant()` computes `due = created + mins` vs `now` regardless of status
(`sla-state.ts:26`). A ticket parked in `pending` keeps burning its SLA and breaches unfairly.

## Key insights from the audit

- The two paused states must **stop the clock**; time spent paused should not count toward the SLA
  deadline. This is an accumulated-pause model, not a status check at render time (a ticket can be
  paused and resumed several times).
- The pure classifier `slaVariant()` already takes `now` as an argument — the least-invasive fix is
  to feed it an **effective now** (raw now minus paused time), leaving the classifier untouched.
- Business-hours calendar is a **separate, optional** concern (also noted in the audit) — deferred;
  see Risks / Next steps. Pausing on status is the 80/20 win.

## Requirements

**Functional**

- Track paused time per ticket. When a ticket enters `pending`/`on_hold`, start accumulating; when
  it leaves, add the elapsed to a running total.
- SLA display (first-response + resolution) computes against **elapsed working time** = wall time −
  paused time, so a paused ticket's countdown freezes.
- If currently paused, the freeze is live (the badge shows a static remaining, not ticking down).

**Non-functional**

- Model must be forgeable-proof and consistent across single + bulk status changes → maintained by
  a DB trigger (same pattern as Phase 01).
- MSW parity for the accumulator + a pure helper both client and mock use.

## Architecture / approach

```
status change ──► BEFORE UPDATE trg accumulate_sla_pause()
   entering pending/on_hold: sla_paused_at := now()
   leaving  pending/on_hold: sla_paused_ms += now() - sla_paused_at; sla_paused_at := null
render ──► effectiveNow = now - sla_paused_ms - (paused ? now - sla_paused_at : 0)
        └► slaVariant({ createdAt, dueMinutes, doneAt, now: effectiveNow })
```

- Migration `NNNNNN_sla_clock_pause.sql`: add `tickets.sla_paused_at timestamptz`,
  `tickets.sla_paused_ms bigint not null default 0`; trigger `accumulate_sla_pause()` on status
  transitions in/out of the paused set.
- Frontend: add `sla-pause.ts` pure helper `effectiveNow({ now, pausedMs, pausedAt })`;
  `ticket-sla-card.tsx` uses it to derive `now` before calling `slaVariant`. `sla-state.ts` stays
  pure and unchanged (already accepts `now`).
- Schema: extend `ticket-schema` with `slaPausedAt` / `slaPausedMs`.
- MSW: `ticket-store` maintains the accumulator on status change; fixtures get sane defaults.

## Related code files

**Create**

- `supabase/migrations/NNNNNN_sla_clock_pause.sql`
- `src/features/tickets/components/sla-pause.ts` (pure helper) + `sla-pause.test.ts`

**Modify**

- `src/features/tickets/components/ticket-sla-card.tsx` — feed effective now
- `src/features/tickets/schemas/ticket-schema.ts` — add paused fields
- `src/mocks/stores/ticket-store.ts` — accumulate on status change
- `src/mocks/fixtures/tickets.ts` — default new fields
- Tests: `sla-state.test.ts` (unchanged), new `sla-pause.test.ts`, workflow test for pause/resume

## Implementation steps

1. Migration: add the two columns + `accumulate_sla_pause()` trigger. Handle create defaulting to
   0 / null and the enter/leave transitions symmetrically.
2. Regenerate DB types; extend `ticket-schema` + fixtures.
3. Write `sla-pause.ts` `effectiveNow()` pure helper (epoch ms in/out) with unit tests.
4. Wire `ticket-sla-card.tsx` to compute effective now and pass it into `slaVariant`.
5. MSW: mirror the accumulator in `ticket-store` on status writes (single + bulk).
6. Tests: a ticket paused 2h then resumed has its due pushed ~2h; a currently-paused ticket's
   badge is frozen; met/breached still correct when never paused.

## Todo

- [ ] Migration: `sla_paused_at` + `sla_paused_ms` + `accumulate_sla_pause()` trigger
- [ ] `db:types` + `ticket-schema` + fixtures updated
- [ ] `sla-pause.ts` pure helper + unit tests
- [ ] `ticket-sla-card.tsx` uses effective now
- [ ] MSW accumulator parity (single + bulk status change)
- [ ] Pause/resume regression tests (fail on unfixed code)

## Success criteria

A ticket sitting in `pending`/`on_hold` does not accrue SLA time: its first-response/resolution
countdown freezes while paused and resumes on return to an active status, matched by the DB
accumulator and the live badge. Never-paused tickets behave exactly as before.

## Risks

| Risk                                                                     | L×I | Mitigation                                                                                    |
| ------------------------------------------------------------------------ | --- | --------------------------------------------------------------------------------------------- |
| Clock skew between DB `now()` and client `Date.now()` makes badge jitter | M×L | Freeze display while paused (no ticking); tolerate small skew — cosmetic only                 |
| Accumulator double-counts if trigger fires on non-status updates         | M×M | Only act when the status actually crosses the paused-set boundary (`OLD.status`/`NEW.status`) |
| Two sources of truth (DB trigger + MSW) drift                            | M×M | Single pure rule; MSW mirrors it; tests assert both                                           |
| Scope creep into business-hours calendar                                 | M×L | Explicitly deferred; pausing-on-status only                                                   |

## Security / RLS considerations

- `accumulate_sla_pause()` is `BEFORE UPDATE` mutating `NEW` on the same row — no cross-row writes,
  no `SECURITY DEFINER` needed (it only edits the row already being updated under the caller's RLS).
- Paused columns are DB-maintained; the client treats them read-only (never sent on update).

## Next steps

Business-hours SLA calendar is a future phase if needed — noted, out of scope here.
</content>
