-- Reopening a ticket restarts its resolution SLA.
--
-- Phase 03 reopen clears resolved_at, but due_at stayed frozen at the original
-- (created_at + resolution) — so a ticket solved within SLA and reopened weeks later read as
-- breached the instant it reopened. A reopen should grant a fresh resolution window.
--
-- Handled here in stamp_ticket_sla (the one owner of the SLA columns) rather than in the
-- reopen trigger, so EVERY path that moves a ticket out of `solved` back into an active state
-- gets the fresh window — the customer-reply reopen and an agent manually reopening alike.
-- solved→closed is terminal and does not restart. Recreated in full (create or replace) with
-- the new branch appended.
create or replace function public.stamp_ticket_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy public.sla_policies;
begin
  -- created_at is server-authoritative up to now(): a forged future value can't push the
  -- deadline out, while the seed's historical dates are preserved.
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

  -- Reopen restarts the resolution clock: leaving `solved` for an active status grants a
  -- fresh window from now. `closed` is terminal, so it is excluded.
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
