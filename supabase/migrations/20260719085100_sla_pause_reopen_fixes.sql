-- Fix: this trigger runs before `stamp_ticket_sla` clamps `created_at`, so a forged future value
-- left the pause start in the future and produced negative paused time on resume
create or replace function public.accumulate_sla_pause()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status in ('pending', 'on_hold') then
      new.sla_paused_at := least(new.created_at, now());
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

-- Fix: a reopen granted a fresh window but kept the pause banked before the solve, leaking grace
create or replace function public.stamp_ticket_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy public.sla_policies;
begin
  if tg_op = 'INSERT' then
    new.created_at := least(new.created_at, now());
  end if;

  if tg_op = 'INSERT'
     or (tg_op = 'UPDATE' and new.priority is distinct from old.priority and new.resolved_at is null)
  then
    v_policy := public.sla_policy_for_priority(new.priority);
    new.sla_policy_id := v_policy.id;
    new.due_at := case
      when v_policy.resolution_mins is not null
        then new.created_at + make_interval(mins => v_policy.resolution_mins)
      else new.due_at
    end;
  end if;

  if tg_op = 'UPDATE'
     and new.status = 'solved' and old.status is distinct from 'solved'
     and new.resolved_at is null
  then
    new.resolved_at := now();
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'solved'
     and new.status in ('open', 'pending', 'on_hold')
  then
    v_policy := public.sla_policy_for_priority(new.priority);
    new.due_at := case
      when v_policy.resolution_mins is not null
        then now() + make_interval(mins => v_policy.resolution_mins)
      else new.due_at
    end;
    new.sla_paused_ms := 0;
  end if;

  return new;
end;
$$;
