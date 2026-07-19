# Phase 06 — Gate Agent UI / Read-Only Ticket Detail for Customers

**Priority:** P2 (UX correctness) · **Status:** ✅ done · **Depends:** none

## Context

- [Audit report](../reports/from-domain-audit-to-planner-helpdesk-business-logic-report.md) gap #8 (WRONG UX, not a leak)
- `src/features/tickets/pages/ticket-detail.tsx:118-140` — sidebar renders TicketProperties/SLA/AI/Attachments/Activity unconditionally
- `src/features/tickets/components/ticket-properties.tsx` — agent workflow controls
- `src/features/tickets/components/ai-suggestion-panel.tsx:31` — already gated on `isAiEnabled`, not on role
- `src/features/tickets/components/ticket-composer.tsx:39` — internal toggle already gated on `message.create.internal`
- `src/stores/auth` — `hasPermission(code)` selector (used in composer)

## Overview

A customer opening a ticket sees the full agent workflow sidebar — status/priority/assignee
selects, SLA card, AI panel — rendered unconditionally (`ticket-detail.tsx:118-140`). RLS rejects
the writes so nothing leaks, but showing agent-only controls to a customer is wrong UX and
confusing. Gate the workflow UI behind `ticket.update`; render a read-only detail for customers.

## Key insights from the audit

- This is **UX only** — the security boundary already holds (RLS denies customer writes). So the
  change is purely client-side gating, no migration.
- The pattern already exists in the codebase: `ticket-composer.tsx:39` gates the internal-note
  toggle on `hasPermission('message.create.internal')`, and `ai-suggestion-panel.tsx:31` gates on
  `isAiEnabled`. Reuse `useAuthStore(...).hasPermission('ticket.update')` — do not invent a new
  mechanism (DRY).
- A customer still needs a **useful** read-only view: their ticket's status/priority (as badges,
  already shown at the top `ticket-detail.tsx:77-98`), the conversation, attachments, and the reply
  composer (public replies are their voice). Hide only the agent controls (TicketProperties, SLA
  internals, AI panel, activity feed if considered internal).

## Requirements

**Functional**

- If the viewer lacks `ticket.update` (i.e. a customer): hide `TicketProperties`, the AI suggestion
  panel, and the SLA card (SLA targets are internal ops data). Keep: header status/priority badges,
  message list, attachments, and the composer (public reply only — the internal toggle is already
  gated).
- If the viewer holds `ticket.update` (agent/admin/owner): unchanged full sidebar.
- Decide Activity feed visibility for customers: **hide** by default (it's an ops/audit view) —
  confirm.

**Non-functional**

- Zero backend change. Guard **after hooks** run (code-standards: "Hooks run before any early
  return" — `code-standards.md:189`). Gate at render, not by early-returning above hooks.

## Architecture / approach

```
ticket-detail render:
  const canWork = useAuthStore(s => s.hasPermission('ticket.update'))
  sidebar: {canWork && <Properties/> } {canWork && <SlaCard/>} ...
  main:    <MessageList/> {canWork && <AiSuggestionPanel/>} <Composer/>
```

- Single source: read `hasPermission('ticket.update')` once in `ticket-detail.tsx`; pass down or
  conditionally render. Keep all hooks (queries, memos) above the conditional JSX — no early return.
- No changes to child components' internals beyond what's needed; prefer conditional rendering in
  the page over scattering permission checks into each child (KISS).

## Related code files

**Modify**

- `src/features/tickets/pages/ticket-detail.tsx` — gate sidebar/AI on `ticket.update`
- (only if cleaner) `src/features/tickets/components/ai-suggestion-panel.tsx` — already role-agnostic; page-level gate is enough
- Tests: a customer-role render hides agent controls; an agent-role render shows them

## Implementation steps

1. In `ticket-detail.tsx`, add `const canWork = useAuthStore(s => s.hasPermission('ticket.update'))`
   (kept above the existing early `isError` return? — no: `hasPermission` is a hook selector, place
   with the other hooks near the top, before any conditional JSX).
2. Wrap `TicketProperties`, `TicketSlaCard`, `AiSuggestionPanel`, and (per decision) `TicketActivity`
   in `{canWork && ...}`.
3. Keep header badges, message list, attachments, and composer for everyone.
4. Verify i18n: no new strings likely; if an empty-sidebar state needs a note, add `en`+`vi` keys.
5. Tests via `src/testing/render.tsx` with a customer vs agent auth state: assert presence/absence
   of the workflow controls (query by role/label).

## Todo

- [x] `ticket-detail.tsx` gates Properties + SLA + AI + Similar tickets + Activity on `ticket.update` (user confirmed: hide all agent panels)
- [x] Customer keeps: header badges, conversation, attachments, public-reply composer
- [x] Hooks stay above conditional JSX (`canWork` selector sits with the other hooks; queries still run, only the JSX is gated — no hook-order break)
- [x] Component tests: `ticket-detail.test.tsx` renders the real route (so `getRouteApi` resolves) with agent vs customer permissions; asserts sidebar headings present/absent. Realtime presence stubbed (websocket, orthogonal). 2 tests, 145 total pass.
- [x] i18n: none needed (customer sidebar shows the Attachments card, no empty-state copy)

**Decision (user-confirmed):** hide Properties + SLA + AI + Similar tickets **and** the Activity feed from customers; keep the Attachments card. So a customer sees: status/priority badges, the conversation, attachments, and the public-reply composer only.

**Post-review fix (Medium):** gating the UI wasn't enough — the hidden panels' queries still ran, so a customer's client fetched the agent roster (`assignable_agents`), the team/category/tag lookups (all `SELECT true` under RLS) and their ticket's internal audit events. Threaded `enabled` (default on) through `useTicketEvents`, `useTicketTags`, `useTicketFilterOptions` → the 4 list hooks (`useAssigneeOptions` + the shared `createCrudQueries.useList`), and pass `canWork`. Now a customer fetches none of it. Test asserts the agent-roster RPC is called for an agent and **never** for a customer.

**Presence gating (user-approved follow-up):** `useTicketDetailRealtime(ticketId, trackPresence)` now gates only the presence roster — a customer still gets live thread refetches on a new message, but does not join presence, so agents viewing their ticket are never shown to them (and the customer isn't broadcast either). Live thread updates stay on for everyone.

## Success criteria

A customer viewing their ticket sees a clean read-only detail (status/priority badges, thread,
attachments, reply box) with no agent controls. An agent sees the full workflow sidebar exactly as
today. No RLS/backend change; covered by role-based component tests.

## Risks

| Risk                                                           | L×I | Mitigation                                                                                        |
| -------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------- |
| Hiding SLA/Activity removes info a customer legitimately wants | L×L | Keep status/priority badges + full conversation; SLA/activity are ops data — confirm with product |
| Early-return above hooks breaks React hook order               | L×H | Gate via conditional JSX after all hooks (code-standards.md:189)                                  |
| Permission check drifts from RLS (UI shows what RLS denies)    | L×M | Use the same `ticket.update` code RLS checks; RLS remains the real guard                          |

## Security / RLS considerations

- No security change — RLS already denies customer writes (`tickets_update` needs `ticket.update` +
  `can_access_ticket`). This phase only aligns the UI with the existing boundary.
- Do not rely on client gating for security; it is UX. The composer's public-reply path stays open
  to customers (that is their legitimate write, already allowed by `ticket_messages_insert`).

## Next steps

Independent of other phases; can ship any time after decisions on Activity-feed visibility.
</content>
