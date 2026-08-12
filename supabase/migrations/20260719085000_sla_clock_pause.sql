-- Time spent waiting on someone else must not count toward the deadline, else a parked ticket
-- breaches unfairly
alter table public.tickets
  add column sla_paused_at timestamptz,
  add column sla_paused_ms bigint not null default 0;

comment on column public.tickets.sla_paused_at is
  'When the current SLA pause started (pending/on_hold); null while the clock runs.';
comment on column public.tickets.sla_paused_ms is
  'Total milliseconds the SLA clock has been paused across all pending/on_hold spells.';

-- Fires only when status crosses the paused boundary, so an unrelated update never double-counts
create or replace function public.accumulate_sla_pause()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status in ('pending', 'on_hold') then
      new.sla_paused_at := new.created_at;
    end if;
    return new;
  end if;

  if old.status not in ('pending', 'on_hold') and new.status in ('pending', 'on_hold') then
    new.sla_paused_at := now();
  elsif old.status in ('pending', 'on_hold') and new.status not in ('pending', 'on_hold') then
    if old.sla_paused_at is not null then
      new.sla_paused_ms :=
        old.sla_paused_ms + (extract(epoch from (now() - old.sla_paused_at)) * 1000)::bigint;
    end if;
    new.sla_paused_at := null;
  end if;

  return new;
end;
$$;

create trigger tickets_accumulate_sla_pause
before insert or update on public.tickets
for each row
execute function public.accumulate_sla_pause();
