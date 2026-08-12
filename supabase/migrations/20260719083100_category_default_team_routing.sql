alter table public.categories
  add column default_team_id uuid references public.teams (id) on delete set null;

comment on column public.categories.default_team_id is
  'Team a ticket in this category is auto-routed to on create (null = no routing).';

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
