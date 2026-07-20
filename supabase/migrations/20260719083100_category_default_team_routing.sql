-- Auto-routing by category. Team assignment was fully manual (no team until an admin picked one).
-- This adds a per-category default team and a trigger applying it on create — so a "Billing
-- question" lands on the Billing team; the triage queue catches anything with no category/default.

alter table public.categories
  add column default_team_id uuid references public.teams (id) on delete set null;

comment on column public.categories.default_team_id is
  'Team a ticket in this category is auto-routed to on create (null = no routing).';

-- BEFORE INSERT: fill team_id from the category's default only when null, so an agent-chosen team
-- is never overridden. A trigger, not client logic, so every create path is covered.
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
