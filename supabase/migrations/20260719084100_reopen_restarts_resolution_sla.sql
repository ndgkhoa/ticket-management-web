-- Reopening a ticket restarts its resolution SLA. Reopen clears resolved_at, but due_at stayed
-- frozen at the original (created_at + resolution), so a ticket reopened weeks later read as breached
-- the instant it reopened. Handled here in stamp_ticket_sla (the sole owner of the SLA columns), so
-- every path out of `solved` into an active state gets the fresh window (customer-reply and manual
-- reopen alike); solved→closed is terminal and does not restart.
create or replace function public.stamp_ticket_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy public.sla_policies;
begin
  -- created_at server-authoritative: a forged future value can't push the deadline out; past dates preserved.
  if tg_op = 'INSERT' then
    new.created_at := least(new.created_at, now());
  end if;

  -- Set on create, and recompute if priority changes before the ticket is resolved.
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

  -- Stamp resolution once, on entering `solved`.
  if tg_op = 'UPDATE'
     and new.status = 'solved' and old.status is distinct from 'solved'
     and new.resolved_at is null
  then
    new.resolved_at := now();
  end if;

  -- Reopen: leaving `solved` for an active status grants a fresh window from now; `closed` excluded (terminal).
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
