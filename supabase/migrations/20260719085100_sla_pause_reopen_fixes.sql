-- Fixes found reviewing Phase 04:
--  1. accumulate_sla_pause on INSERT started the pause from the client-supplied created_at,
--     which stamp_ticket_sla clamps to now() a moment later (accumulate fires first). A forged
--     future created_at left sla_paused_at in the future → negative paused time on resume. Clamp
--     it here too, matching the created_at clamp.
--  2. A reopen grants a fresh resolution window (due_at = now + resolution) but left the banked
--     sla_paused_ms from before the solve, leaking extra grace into the new window. Reset the
--     pause budget to 0 on reopen so the fresh window starts with a fresh clock.

create or replace function public.accumulate_sla_pause()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Created paused starts the clock — clamped to now() to match stamp_ticket_sla's created_at
    -- clamp (this trigger fires first, before that clamp lands).
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

  -- Reopen restarts the resolution clock with a fresh window AND a fresh pause budget — banked
  -- pause from before the solve does not carry into the new window. (sla_paused_at is left to
  -- accumulate_sla_pause, which fires first and may have started a pause for solved→pending.)
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
