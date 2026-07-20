-- Authoritative SLA timestamping. sla_policy_id / due_at / first_response_at / resolved_at existed
-- but the app never wrote them. These triggers stamp them in-db on the causing event, so every
-- write path (single update, bulk_update_tickets, message insert) is covered and a client can't forge an SLA "met".
-- SECURITY DEFINER + search_path = '': the stamping reads sla_policies and writes SLA columns the
-- caller may not touch, and must be authoritative regardless of the caller's RLS.

-- The policy governing a priority. `sla_policies.priority` is unique, so this is single-valued.
create or replace function public.sla_policy_for_priority(p public.ticket_priority)
returns public.sla_policies
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.sla_policies where priority = p limit 1;
$$;

-- BEFORE INSERT/UPDATE: resolve sla_policy_id + due_at from priority, stamp resolved_at on entering
-- `solved`. first_response_at is not set here — an agent reply starts that clock (see stamp_first_response).
create or replace function public.stamp_ticket_sla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy public.sla_policies;
begin
  -- created_at server-authoritative: `least` clamps a forged future value (which would push the SLA
  -- deadline out) to now(), while a genuine past date stays past.
  if tg_op = 'INSERT' then
    new.created_at := least(new.created_at, now());
  end if;

  -- Set on create; recompute if priority changes before resolution (a resolved ticket freezes its SLA).
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

  -- Stamp resolution once, on entering `solved`. Re-entering solved must not move it.
  if tg_op = 'UPDATE'
     and new.status = 'solved' and old.status is distinct from 'solved'
     and new.resolved_at is null
  then
    new.resolved_at := now();
  end if;

  return new;
end;
$$;

create trigger tickets_stamp_sla
before insert or update on public.tickets
for each row
execute function public.stamp_ticket_sla();

-- AFTER INSERT on ticket_messages: the first public reply from an agent (holds ticket.update) starts
-- the first-response clock. Write-once via the `first_response_at is null` guard.
create or replace function public.stamp_first_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type = 'public_reply'
     and new.author_id is not null
     and public.has_permission(new.author_id, 'ticket.update')
  then
    update public.tickets
    set first_response_at = now()
    where id = new.ticket_id
      and first_response_at is null;
  end if;
  return new;
end;
$$;

create trigger ticket_messages_stamp_first_response
after insert on public.ticket_messages
for each row
execute function public.stamp_first_response();
