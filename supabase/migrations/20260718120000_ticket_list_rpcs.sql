-- RPCs backing the ticket list: the assignee filter's option source, and the
-- filter-scoped bulk update. Both run as the caller (security invoker) so row-level
-- security decides what each user may see and change — the function never widens access.

-- Agents a ticket may be assigned to: profiles holding `ticket.update`. The assignee
-- filter reads this rather than the whole profiles table, so a customer never appears as
-- an assignment target. Security invoker: profiles RLS still applies, but the set is the
-- staff roster, which every agent may already see.
create or replace function public.assignable_agents()
returns setof public.profiles
language sql
stable
security invoker
set search_path = ''
as $$
  select p.*
  from public.profiles p
  where public.has_permission(p.id, 'ticket.update')
  order by p.full_name nulls last;
$$;

grant execute on function public.assignable_agents() to authenticated;

-- Filter-scoped bulk status/assignee change. The caller hands the ticket list's own
-- filter object (page-scoped selection sends `{ "id": [...] }`; select-all-matching sends
-- the active structural filters), so the server mutates exactly the set the list shows —
-- one small request, never a payload of thousands of ids.
--
-- Security invoker is the whole safety model: the UPDATE runs as the caller, so the
-- `tickets_update` policy (holds `ticket.update` AND can_access_ticket) decides every row.
-- A customer, or an agent reaching for tickets they can't see, updates nothing — the
-- function never widens what RLS already allows, and the returned count is the real
-- number of rows RLS let through.
create or replace function public.bulk_update_tickets(p_filters jsonb, p_patch jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  -- A patch that sets neither field changes nothing — return early rather than bump
  -- updated_at on every matched row (which, with empty filters, is the whole visible set).
  if not (p_patch ? 'status' or p_patch ? 'assignee_id') then
    return 0;
  end if;

  update public.tickets t
  set
    status = case when p_patch ? 'status'
                  then (p_patch ->> 'status')::public.ticket_status
                  else t.status end,
    -- Empty string is the "unassign" sentinel the client sends for a null assignee.
    assignee_id = case when p_patch ? 'assignee_id'
                       then nullif(p_patch ->> 'assignee_id', '')::uuid
                       else t.assignee_id end,
    updated_at = now()
  where
    (not (p_filters ? 'id')
       or t.id::text = any (array(select jsonb_array_elements_text(p_filters -> 'id'))))
    and (not (p_filters ? 'status')
       or t.status::text = any (array(select jsonb_array_elements_text(p_filters -> 'status'))))
    and (not (p_filters ? 'priority')
       or t.priority::text = any (array(select jsonb_array_elements_text(p_filters -> 'priority'))))
    and (not (p_filters ? 'assignee_id')
       or t.assignee_id::text = any (array(select jsonb_array_elements_text(p_filters -> 'assignee_id'))))
    and (not (p_filters ? 'team_id')
       or t.team_id::text = any (array(select jsonb_array_elements_text(p_filters -> 'team_id'))))
    and (not (p_filters ? 'category_id')
       or t.category_id::text = any (array(select jsonb_array_elements_text(p_filters -> 'category_id'))))
    and (not (p_filters ? 'tag_id')
       or exists (
         select 1
         from public.ticket_tags tt
         where tt.ticket_id = t.id
           and tt.tag_id::text = any (array(select jsonb_array_elements_text(p_filters -> 'tag_id')))
       ));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.bulk_update_tickets(jsonb, jsonb) to authenticated;
