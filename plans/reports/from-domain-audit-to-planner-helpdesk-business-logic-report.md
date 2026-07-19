# Help-Desk Business-Logic Audit — findings for planning

Audit of whether the app models a real help desk correctly (vs Zendesk/Freshdesk/Intercom).
Scope: schema (`supabase/migrations/*`), RLS, and how `src/features/**` actually uses each
table. Verdicts + `file:line` evidence. Advisory — no code changed by the audit.

Foundation (RBAC, RLS, message visibility, ticket visibility) is **correct**. The gaps are
in help-desk **workflows** — several are demo-grade. Ordered by real-world impact.

## Gaps / wrong models (ranked)

1. **SLA is cosmetic — the running app never writes any SLA timestamp** (WRONG, highest).
   `due_at` / `first_response_at` / `resolved_at` / `sla_policy_id` are set only in
   seed/mocks (`src/mocks/fixtures/tickets.ts`). Create hard-codes them null
   (`ticket-api.ts:170`); update never stamps `resolved_at` (`ticket-api.ts:197`); posting
   a reply never stamps `first_response_at` (`ticket-message-api.ts:35`); nothing computes
   `due_at` from a policy. The SLA card recomputes display live (`ticket-sla-card.tsx`), so
   the demo looks right but any real ticket shows first-response perpetually pending/breached
   and resolution never met. → Stamp on the triggering event; best as DB triggers.

2. **New customer tickets are invisible to agents — no triage queue** (WRONG). New tickets
   have `assignee=null, team=null` (`ticket-api.ts:170`); `agent` lacks `ticket.read.all`
   (`seed.sql`), and `can_access_ticket` only grants own/team rows. So new tickets are seen
   only by requester + admin/owner until an admin hand-assigns. Real desks make the
   unassigned/new queue the agent's main workspace. → grant team-triage read of unteamed
   tickets, or auto-route on create.

3. **No auto-routing** (GAP). No category→team mapping, default team, round-robin, or rules.
   Assignment is a manual dropdown (`ticket-properties.tsx`). Combined with #2, every ticket
   needs manual admin routing.

4. **No status lifecycle rules / reopen / auto-close** (GAP/WRONG). Status is any→any with no
   guards (`ticket-properties.tsx`). A customer reply on a `solved` ticket does not reopen it
   (`ticket-message-queries.ts`). No auto-close of solved→closed after N days.

5. **`pending`/`on_hold` don't pause the SLA clock** (WRONG). `slaVariant()` computes
   `due = created + mins` vs now regardless of status (`sla-state.ts:26`); the two states
   exist precisely to pause the timer. Also no business-hours calendar.

6. **Bulk updates leave no audit trail and skip side-effects** (GAP).
   `bulk_update_tickets` is a bare UPDATE; `useBulkUpdateTickets` records no `ticket_events`
   and stamps no `resolved_at` on bulk-solve.

7. **Audit trail partial + self-attested** (GAP). Team/category changes emit no event (no
   event type); events are client-written `actor_id = self`, and RLS even lets a customer
   write `commented` rows. → move event emission to DB triggers.

8. **Customer sees the agent workflow sidebar** (WRONG UX, not a leak). Ticket detail renders
   TicketProperties/SLA/AI panel unconditionally (`ticket-detail.tsx`); RLS rejects the
   writes so nothing leaks, but a customer is shown agent-only controls. → gate behind
   `ticket.update`, render read-only for customers.

9. **Canned responses managed but never consumed** (GAP, confirmed). Full admin CRUD, but no
   composer picker and the only `ai-suggest-reply` caller never passes `cannedResponses`
   (`ai-suggestion-panel.tsx`). → add a composer picker and feed the AI.

## Confirmed correct (do not touch)

RBAC model + enforcement (RLS `has_permission` + client guards); internal-note boundary
(customers can't read/forge notes); `can_access_ticket` shared by SELECT/UPDATE/DELETE;
agent team-scoping; attachments/tags/categories/saved_views genuinely wired; self-signup
pinned to `customer` server-side.

## Suggested phase order (highest value first)

1. SLA correctness via DB triggers (stamp first_response_at / resolved_at / due_at; fixes #1 + #6 + part of #7).
2. Triage queue + optional auto-route on create (#2, #3).
3. Status lifecycle: auto-reopen on customer reply, auto-close solved after N days (#4).
4. Pause SLA clock during pending/on_hold; optional business hours (#5).
5. Full audit trail via triggers (#7).
6. Gate customer view / read-only detail (#8).
7. Consume canned responses in composer + AI (#9).

## Open questions

- Is a scheduler/edge layer (auto-close, SLA breach notifications) intended? None exists today.
- Is admin-only triage a deliberate single-tenant simplification or an oversight? It
  contradicts the `agent` role's stated purpose.
