-- Teach bulk_update_tickets the triage filter. Without a triage branch, "select all matching" in
-- the triage view would mutate every ticket the caller can see (RLS-bounded, but far wider than the
-- ~40 visible rows). Add the same `assignee_id is null and team_id is null` constraint the read path uses.
-- Otherwise unchanged: security invoker, the no-op guard, and resolved_at still stamped by stamp_ticket_sla.
create or replace function public.bulk_update_tickets(p_filters jsonb, p_patch jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not (p_patch ? 'status' or p_patch ? 'assignee_id') then
    return 0;
  end if;

  update public.tickets t
  set
    status = case when p_patch ? 'status'
                  then (p_patch ->> 'status')::public.ticket_status
                  else t.status end,
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
    -- Triage scope: unassigned AND unteamed, matching the list's triage view exactly.
    and (not (p_filters ? 'triage')
       or (t.assignee_id is null and t.team_id is null))
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
