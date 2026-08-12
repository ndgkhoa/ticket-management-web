-- Fix: reopening cleared `resolved_at` but left `due_at` frozen, so the ticket read as breached
-- the instant it reopened
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
  end if;

  return new;
end;
$$;
