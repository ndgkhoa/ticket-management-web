-- SLA columns are stamped in-db so no client can forge a met deadline; definer, since the caller
-- may not touch them
create or replace function public.sla_policy_for_priority(p public.ticket_priority)
returns public.sla_policies
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.sla_policies where priority = p limit 1;
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
    -- Clamped: a forged future `created_at` would push the deadline out
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

  return new;
end;
$$;

create trigger tickets_stamp_sla
before insert or update on public.tickets
for each row
execute function public.stamp_ticket_sla();

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
