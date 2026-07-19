-- Triage queue visibility.
--
-- A brand-new customer ticket lands unassigned and unteamed. Until now `can_access_ticket`
-- only granted an agent their own + their team's tickets, so new tickets were invisible to
-- every agent until an admin hand-assigned one — the opposite of a real desk, where the
-- unassigned queue is the agent's main workspace (audit gap #2).
--
-- Extend the ONE visibility definition (shared by the SELECT/UPDATE/DELETE policies) with a
-- triage branch: any holder of `ticket.read.team` may also see tickets that are BOTH
-- unassigned AND unteamed. Requiring both nulls keeps the queue to genuinely-new tickets — an
-- assigned-but-unteamed ticket is someone's work, not triage. Because UPDATE reuses the same
-- function, triage-visible also means triage-updatable: that is the intended "claim from the
-- queue" behaviour (an agent picks up a new ticket by assigning it to themselves).
create or replace function public.can_access_ticket(
  uid uuid,
  ticket_requester_id uuid,
  ticket_assignee_id uuid,
  ticket_team_id uuid
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    -- Your own ticket (the customer path).
    ticket_requester_id = uid
    -- Everything (admin/owner).
    or public.has_permission(uid, 'ticket.read.all')
    -- Yours or your team's (the agent path).
    or (
      public.has_permission(uid, 'ticket.read.team')
      and (
        ticket_assignee_id = uid
        or (ticket_team_id is not null and public.is_team_member(uid, ticket_team_id))
      )
    )
    -- The triage queue: unassigned AND unteamed, visible to any agent so a new ticket is
    -- never stranded. Both must be null — a ticket with an assignee or a team is already owned.
    or (
      public.has_permission(uid, 'ticket.read.team')
      and ticket_assignee_id is null
      and ticket_team_id is null
    );
$$;
