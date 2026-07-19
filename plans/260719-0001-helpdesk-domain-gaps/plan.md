---
title: 'Help-desk domain-logic gaps'
description: 'Close the business-logic gaps that make the demo help desk behave like a real one — SLA, triage, lifecycle, audit trail.'
status: pending
priority: P1
effort: ~30h
branch: develop
tags: [helpdesk, sla, workflow, rls, triggers]
created: 2026-07-19
---

# Help-Desk Domain-Logic Gaps

Make the seeded demo behave like a **real single-tenant help desk**. The foundation
(RBAC, RLS, message visibility, ticket visibility) is correct; the gaps are in help-desk
**workflows** — several are demo-grade. Source of truth for every gap + `file:line`
evidence: [audit report](../reports/from-domain-audit-to-planner-helpdesk-business-logic-report.md).

## Product

Customer opens tickets → **agent** works them (by team) → **admin/owner** administers.
Today an SLA never gets stamped, a new ticket is invisible to agents until an admin hand-
assigns it, a solved ticket never reopens on a customer reply, and the audit trail is self-
attested by the client. The through-line of the fix: **move the domain invariants into the
database** (triggers + a triage-visibility rule) so every write path — including bulk — is
consistent and values can't be forged, then wire the last of the agent tooling (canned
responses) into the UI.

"Admin manually routes/assigns everything" is treated as an **oversight being fixed**, not a
deliberate design — it contradicts the `agent` role's stated purpose (`seed.sql:203`).

## Guiding principle

DB is the source of truth for domain invariants; the client renders and requests, it does not
enforce. Because Postgres triggers do **not** run under MSW, every trigger has a **mirrored
mock** in `src/mocks/**` so tests + the static demo stay faithful to live behaviour — this
parity is a first-class deliverable in each phase, not an afterthought.

## Phases

| #   | Phase                                                                    | Status  |
| --- | ------------------------------------------------------------------------ | ------- |
| 01  | [SLA correctness via DB triggers](phase-01-sla-timestamp-triggers.md)    | ✅ done |
| 02  | [Triage queue + auto-route + team UI](phase-02-triage-and-routing.md)    | ✅ done |
| 03  | [Status lifecycle: reopen + auto-close](phase-03-status-lifecycle.md)    | ⬜ todo |
| 04  | [Pause SLA clock (pending/on_hold)](phase-04-sla-clock-pause.md)         | ⬜ todo |
| 05  | [Audit trail via DB triggers](phase-05-audit-trail-triggers.md)          | ⬜ todo |
| 06  | [Gate agent UI / read-only for customers](phase-06-customer-readonly.md) | ⬜ todo |
| 07  | [Consume canned responses (composer + AI)](phase-07-canned-responses.md) | ⬜ todo |

## Key dependencies

- **01 is the keystone** — it establishes the trigger + mock-parity pattern every later DB
  phase reuses. Do it first.
- **04 depends on 01** (needs `due_at`/stamps in place before it can pause the clock).
- **05 depends on 01 + 02** (audit triggers cover the state changes those phases introduce:
  status, assignee, team, category, bulk).
- **02 is self-contained** but its team-membership UI is a prerequisite for team-based routing
  to mean anything in a real deploy.
- **03 / 06 / 07 are independent** of each other; sequence by value.
- Migrations are named by **domain slug only** (no phase numbers), e.g.
  `NNNNNN_sla_timestamp_triggers.sql`, `NNNNNN_ticket_triage_visibility.sql`.

## References

- [Audit report](../reports/from-domain-audit-to-planner-helpdesk-business-logic-report.md) — gaps + evidence
- [../260715-2241-ticket-management-web-refactor/plan.md](../260715-2241-ticket-management-web-refactor/plan.md) — prior refactor (context)
- `docs/code-standards.md` — conventions every phase respects
</content>

</invoke>
