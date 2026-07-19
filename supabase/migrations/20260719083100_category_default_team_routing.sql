-- Auto-routing by category.
--
-- Assignment was 100% manual: a new ticket had no team until an admin picked one (audit gap
-- #3). Real desks route inbound tickets to the owning team on triage. This adds a per-category
-- default team and a trigger that applies it on create — so a "Billing question" lands on the
-- Billing team automatically, and the triage queue (previous migration) catches anything with
-- no category/default.

alter table public.categories
  add column default_team_id uuid references public.teams (id) on delete set null;

comment on column public.categories.default_team_id is
  'Team a ticket in this category is auto-routed to on create (null = no routing).';

-- BEFORE INSERT on tickets: fill team_id from the category's default when the caller did not
-- already choose a team. Only fires when team_id is null, so an explicit agent-chosen team is
-- never overridden. A trigger (not client logic) so every create path is covered.
create or replace function public.route_ticket_on_create()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.team_id is null and new.category_id is not null then
    new.team_id := (
      select default_team_id from public.categories where id = new.category_id
    );
  end if;
  return new;
end;
$$;

create trigger tickets_route_on_create
before insert on public.tickets
for each row
execute function public.route_ticket_on_create();
