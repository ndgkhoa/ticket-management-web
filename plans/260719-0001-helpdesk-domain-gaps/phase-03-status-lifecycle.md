# Phase 03 — Status Lifecycle: Reopen + Auto-Close

**Priority:** P2 · **Status:** ✅ done · **Depends:** Phase 01 (shares ticket triggers/stamps)

## Context

- [Audit report](../reports/from-domain-audit-to-planner-helpdesk-business-logic-report.md) gap #4
- `supabase/migrations/20260716120000_extensions_and_enums.sql:19` — `ticket_status` enum: `open, pending, on_hold, solved, closed`
- `src/features/tickets/components/ticket-properties.tsx:77-101` — status select is any→any, no guard
- `src/features/tickets/api/ticket-message-queries.ts:25-42` — customer reply does not reopen
- `src/features/tickets/api/ticket-api.ts:186-204` — `resolved_at` interplay (Phase 01)

## Overview

Status is any→any with no lifecycle rules. A customer reply on a `solved` ticket does not reopen
it, and there is no auto-close of `solved`→`closed` after N days. Real desks reopen on customer
activity and sweep stale solved tickets to closed.

## Key insights from the audit

- Reopen must be **server-side**: a customer holds no `ticket.update` permission
  (`seed.sql:265` — customer role has only `ticket.create`), so the reopen has to happen in a
  `SECURITY DEFINER` trigger on `ticket_messages`, not from the client.
- Reopen and first-response stamping both hang off the same message-insert event (Phase 01's
  `stamp_first_response`). Keep them as **separate trigger functions** for clarity, both `AFTER
INSERT on ticket_messages`.
- Reopening must **clear `resolved_at`** so the resolution SLA restarts correctly (ties back to
  Phase 01's write-once guard: clearing is the sanctioned reset).
- Auto-close needs a **scheduler** — none exists today (open question #1). Decision below.

## Requirements

**Functional**

- **Auto-reopen:** a `public_reply` inserted by the ticket's **requester** (customer) on a ticket
  whose status is `solved` sets status back to `open` and clears `resolved_at`. (A reply on
  `closed` does not reopen — closed is terminal; see guard below.)
- **Auto-close:** tickets in `solved` with `resolved_at < now() - N days` transition to `closed`.
  **N = 7 days** (default; confirm — a config value, not hard-coded across the app).
- **Optional transition guards:** reject nonsensical transitions (e.g. `closed`→`pending`) — scope
  as a small `CHECK`/trigger allowlist. Marked optional; keep YAGNI unless it's cheap.

**Non-functional**

- Auto-close job is idempotent and safe to run repeatedly.
- MSW parity: reopen simulated in the message store; auto-close is a scheduled job (no MSW
  equivalent needed — document that the demo won't auto-close, tests drive the function directly).

## Architecture / approach — scheduler decision

```
customer reply ──► AFTER INSERT trg reopen_on_customer_reply() ──► solved→open, resolved_at:=null
scheduler (daily) ──► close_stale_solved_tickets() ──► solved & resolved_at<now()-N → closed
```

**Scheduler = `pg_cron`** (available on Supabase) running a daily `SELECT
close_stale_solved_tickets()`. Rationale: keeps the invariant in the DB with the rest of the
domain logic, no new deploy surface. **Fallback** if `pg_cron` is unavailable in the target
project: a scheduled Supabase Edge Function calling the same SQL function. Either way the logic
lives in one `SECURITY DEFINER` SQL function; only the trigger of that function differs. **Confirm
`pg_cron` availability before implementing.**

- Migration `NNNNNN_ticket_status_lifecycle.sql`:
  - `reopen_on_customer_reply()` trigger fn (`AFTER INSERT on ticket_messages`).
  - `close_stale_solved_tickets(p_days int default 7)` function.
  - Optional `enforce_status_transition()` trigger (allowlist) — behind a decision flag.
  - `cron.schedule(...)` for the daily sweep (or documented edge-function fallback).

## Related code files

**Create**

- `supabase/migrations/NNNNNN_ticket_status_lifecycle.sql`
- (fallback only) `supabase/functions/close-stale-tickets/index.ts`

**Modify**

- `src/mocks/stores/ticket-message-store.ts` + message write handler — simulate reopen on customer reply
- `src/features/tickets/components/ticket-status-badge.tsx` (if `reopened` needs a visual) — likely none
- Tests: `ticket-workflow.test.ts` — reopen behaviour; SQL-level test for auto-close

## Implementation steps

1. Confirm `pg_cron` in the target Supabase project; pick cron vs edge-function fallback.
2. Migration: `reopen_on_customer_reply()` — identify the requester via the parent ticket, act only
   when `type='public_reply'`, author = requester, status = `solved`.
3. Migration: `close_stale_solved_tickets(p_days)` — single UPDATE; schedule daily via `pg_cron`.
4. (Optional) transition allowlist trigger — only if the decision keeps it in scope.
5. MSW: mirror reopen in the message store so the demo/tests show a solved ticket reopening.
6. Tests: customer reply reopens + clears `resolved_at`; agent reply does NOT reopen; reply on
   `closed` does not reopen; auto-close moves an aged solved ticket and leaves fresh ones.
7. `db:types` if needed, build.

## Todo

- [x] Confirm `pg_cron` availability — **available** (1.6.4) and used; `create extension pg_cron` + `cron.schedule` daily at 02:00
- [x] `reopen_on_customer_reply()` trigger (solved→open, clears resolved_at, requester + public_reply only)
- [x] `close_stale_solved_tickets(p_days=7)` + daily schedule
- [~] (Optional) status transition allowlist — **skipped** (YAGNI per the plan; reopen/close cover the real cases)
- [x] MSW reopen parity (`ticket-lifecycle.ts` wired into the message afterInsert)
- [x] Tests: reopen matrix (MSW, 3 cases); auto-close matrix verified live via psql

Verified live (local DB, rolled back): customer reply reopens solved (+ clears resolved_at); agent reply does not; closed stays closed; aged solved (>7d) auto-closes; fresh solved stays. Cron job `close-stale-solved-tickets` registered.

**Post-review fix (decision confirmed):** reopen now **restarts the resolution SLA** — leaving `solved` for an active status recomputes `due_at = now() + resolution_mins` (migration `..._reopen_restarts_resolution_sla.sql` extends `stamp_ticket_sla`; MSW mirrors it). Without this an aged reopened ticket read as breached immediately. Applies to any solved→active path (customer reply + agent manual reopen); solved→closed is terminal and doesn't restart. Verified live: old solved ticket's due_at moves from past → future on reopen.

## Success criteria

A customer replying to a solved ticket flips it to `open` and restarts its resolution SLA. Agent
replies never reopen. Solved tickets older than N days become `closed` on the scheduled run, and
the job is safe to re-run. Reopen is covered by tests; auto-close covered by a SQL-level test.

## Risks

| Risk                                                            | L×I | Mitigation                                                                                        |
| --------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------- |
| No `pg_cron` in target project → auto-close silently never runs | M×H | Confirm first; edge-function fallback; a test that calls the function directly (not the schedule) |
| Reopen loop / thrash if trigger mis-scoped                      | L×M | Act only on `solved`→ (not on already-open); requester + public_reply guard                       |
| Clearing `resolved_at` corrupts a legitimately-met SLA history  | L×M | Reopen is the sanctioned reset; audit event (Phase 05) records the reopen                         |
| Auto-close closes tickets a customer was about to reply to      | M×M | Reopen still applies to `solved`; only `closed` is terminal; N=7d configurable                    |

## Security / RLS considerations

- `reopen_on_customer_reply()` is `SECURITY DEFINER` (customer cannot update tickets) — scope the
  UPDATE to `where id = NEW.ticket_id and status='solved'`.
- `close_stale_solved_tickets()` runs as a job/definer, not as any end user; it must not depend on
  `auth.uid()`. The actor for the resulting audit event (Phase 05) is `null`/system.
- `closed` remains terminal for customers (no reopen), preserving the "reply → open" rule only for
  the reopenable state.

## Next steps

Phase 05 records `status_changed` for both reopen and auto-close (actor = system for the sweep).
</content>
