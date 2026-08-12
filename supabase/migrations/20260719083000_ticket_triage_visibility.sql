-- Adds a triage branch: a new ticket lands unassigned and unteamed, and was invisible to every
-- agent until someone hand-assigned it
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
    ticket_requester_id = uid
    or public.has_permission(uid, 'ticket.read.all')
    or (
      public.has_permission(uid, 'ticket.read.team')
      and (
        ticket_assignee_id = uid
        or (ticket_team_id is not null and public.is_team_member(uid, ticket_team_id))
      )
    )
    or (
      public.has_permission(uid, 'ticket.read.team')
      and ticket_assignee_id is null
      and ticket_team_id is null
    );
$$;
