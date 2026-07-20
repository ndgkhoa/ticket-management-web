-- Triage queue visibility. A new customer ticket lands unassigned + unteamed, and previously
-- can_access_ticket showed an agent only their own + team tickets — so new tickets were invisible
-- until hand-assigned. Extend the single visibility definition with a triage branch: any holder of
-- `ticket.read.team` may also see tickets that are BOTH unassigned AND unteamed (both nulls keep
-- the queue to genuinely-new tickets). UPDATE reuses the same function, so triage-visible is
-- triage-updatable — the intended "claim from the queue" (an agent assigns a new ticket to themselves).
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
    -- The triage queue: unassigned AND unteamed, visible to any agent so a new ticket isn't stranded
    -- (a ticket with an assignee or team is already owned).
    or (
      public.has_permission(uid, 'ticket.read.team')
      and ticket_assignee_id is null
      and ticket_team_id is null
    );
$$;
