-- Pause the SLA clock while a ticket is pending or on_hold.
--
-- Those two states mean "waiting on the requester" / "waiting on something internal" — time
-- spent there must NOT count toward the SLA deadline (audit gap #5). Today the clock keeps
-- running, so a parked ticket breaches unfairly.
--
-- Accumulate paused time on the ticket: `sla_paused_at` marks when the current pause began
-- (null when running); `sla_paused_ms` banks total paused milliseconds across repeated
-- pause/resume cycles. The SLA display subtracts this from wall time. Maintained by a trigger
-- so single, bulk and message-driven status changes all stay consistent and can't be forged.

alter table public.tickets
  add column sla_paused_at timestamptz,
  add column sla_paused_ms bigint not null default 0;

comment on column public.tickets.sla_paused_at is
  'When the current SLA pause started (pending/on_hold); null while the clock runs.';
comment on column public.tickets.sla_paused_ms is
  'Total milliseconds the SLA clock has been paused across all pending/on_hold spells.';

-- The paused set is {pending, on_hold}. BEFORE INSERT/UPDATE, and only when the status
-- actually crosses that set's boundary, so a non-status update never double-counts. No
-- SECURITY DEFINER: it edits only NEW on the row already being written under the caller's RLS.
create or replace function public.accumulate_sla_pause()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Created directly in a paused state starts the pause clock immediately.
    if new.status in ('pending', 'on_hold') then
      new.sla_paused_at := new.created_at;
    end if;
    return new;
  end if;

  if old.status not in ('pending', 'on_hold') and new.status in ('pending', 'on_hold') then
    -- Entering a paused state: start the current pause.
    new.sla_paused_at := now();
  elsif old.status in ('pending', 'on_hold') and new.status not in ('pending', 'on_hold') then
    -- Leaving a paused state: bank the elapsed paused time and stop the pause.
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
