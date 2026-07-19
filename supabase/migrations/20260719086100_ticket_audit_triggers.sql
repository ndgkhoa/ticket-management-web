-- The audit trail moves from the client to the database. Until now the app wrote its own
-- ticket_events (actor = self), so team/category changes logged nothing, bulk changes logged
-- nothing, and the subject of the trail held the pen. These triggers make every state change
-- emit exactly one authoritative event, and the client loses the ability to write the table.

-- One event per changed field on UPDATE; `created` (plus the initial assignment) on INSERT.
-- The actor is the caller (auth.uid()); for a system or seed write with no auth context it
-- falls back to the ticket's own participants so the trail is never left unattributed.
create or replace function public.emit_ticket_change_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.ticket_events (ticket_id, actor_id, event_type, meta)
    values (new.id, coalesce(v_actor, new.requester_id), 'created',
            jsonb_build_object('channel', new.channel));
    if new.assignee_id is not null then
      insert into public.ticket_events (ticket_id, actor_id, event_type, meta)
      values (new.id, coalesce(v_actor, new.assignee_id), 'assigned',
              jsonb_build_object('assignee_id', new.assignee_id, 'team_id', new.team_id));
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.ticket_events (ticket_id, actor_id, event_type, meta)
    values (new.id, v_actor, 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.priority is distinct from old.priority then
    insert into public.ticket_events (ticket_id, actor_id, event_type, meta)
    values (new.id, v_actor, 'priority_changed',
            jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.ticket_events (ticket_id, actor_id, event_type, meta)
    values (new.id, v_actor, 'assigned',
            jsonb_build_object('from', old.assignee_id, 'to', new.assignee_id));
  end if;
  if new.team_id is distinct from old.team_id then
    insert into public.ticket_events (ticket_id, actor_id, event_type, meta)
    values (new.id, v_actor, 'team_changed',
            jsonb_build_object('from', old.team_id, 'to', new.team_id));
  end if;
  if new.category_id is distinct from old.category_id then
    insert into public.ticket_events (ticket_id, actor_id, event_type, meta)
    values (new.id, v_actor, 'category_changed',
            jsonb_build_object('from', old.category_id, 'to', new.category_id));
  end if;
  return new;
end;
$$;

create trigger tickets_emit_change_events
after insert or update on public.tickets
for each row execute function public.emit_ticket_change_events();

-- A reply or internal note logs a `commented` event, attributed to its author (which RLS
-- already pins to the caller on the message insert).
create or replace function public.emit_comment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ticket_events (ticket_id, actor_id, event_type, meta)
  values (new.ticket_id, new.author_id, 'commented',
          jsonb_build_object('type', new.type));
  return new;
end;
$$;

create trigger ticket_messages_emit_comment
after insert on public.ticket_messages
for each row execute function public.emit_comment_event();

-- Adding or removing a tag logs a `tagged` event. The junction carries no actor, so the
-- acting user comes from auth.uid().
create or replace function public.emit_tag_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ticket_events (ticket_id, actor_id, event_type, meta)
    values (new.ticket_id, auth.uid(), 'tagged',
            jsonb_build_object('tag_id', new.tag_id, 'added', true));
    return new;
  end if;
  insert into public.ticket_events (ticket_id, actor_id, event_type, meta)
  values (old.ticket_id, auth.uid(), 'tagged',
          jsonb_build_object('tag_id', old.tag_id, 'added', false));
  return old;
end;
$$;

create trigger ticket_tags_emit_event
after insert or delete on public.ticket_tags
for each row execute function public.emit_tag_event();

-- Close the client's write door. Every event now originates in the triggers above (which run
-- security definer, so they don't need the grant); the client only reads the trail.
drop policy if exists ticket_events_insert on public.ticket_events;
revoke insert on public.ticket_events from authenticated;
