-- match_tickets / similar_tickets predate sla_paused_at + sla_paused_ms, so their RETURNS TABLE
-- omitted them. The client parses every RPC row with the full ticket schema, so a missing column
-- makes the parse throw and semantic results render empty. Re-create both with the two columns.
-- `create or replace` can't widen a RETURNS TABLE, so drop by exact signature first, then re-create.

drop function if exists public.match_tickets(extensions.vector(1536), integer, double precision);
drop function if exists public.similar_tickets(uuid, integer);

create function public.match_tickets(
  query_embedding extensions.vector(1536),
  match_count integer default 10,
  similarity_threshold double precision default 0.3
)
returns table (
  id uuid,
  subject text,
  description text,
  status public.ticket_status,
  priority public.ticket_priority,
  channel public.ticket_channel,
  requester_id uuid,
  assignee_id uuid,
  team_id uuid,
  category_id uuid,
  sla_policy_id uuid,
  first_response_at timestamptz,
  resolved_at timestamptz,
  due_at timestamptz,
  sla_paused_at timestamptz,
  sla_paused_ms bigint,
  created_at timestamptz,
  updated_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    t.id, t.subject, t.description, t.status, t.priority, t.channel,
    t.requester_id, t.assignee_id, t.team_id, t.category_id, t.sla_policy_id,
    t.first_response_at, t.resolved_at, t.due_at, t.sla_paused_at, t.sla_paused_ms,
    t.created_at, t.updated_at,
    1 - (t.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.tickets t
  where t.embedding is not null
    and 1 - (t.embedding OPERATOR(extensions.<=>) query_embedding) >= similarity_threshold
  order by t.embedding OPERATOR(extensions.<=>) query_embedding
  limit greatest(match_count, 0);
$$;

create function public.similar_tickets(
  p_ticket_id uuid,
  match_count integer default 5
)
returns table (
  id uuid,
  subject text,
  description text,
  status public.ticket_status,
  priority public.ticket_priority,
  channel public.ticket_channel,
  requester_id uuid,
  assignee_id uuid,
  team_id uuid,
  category_id uuid,
  sla_policy_id uuid,
  first_response_at timestamptz,
  resolved_at timestamptz,
  due_at timestamptz,
  sla_paused_at timestamptz,
  sla_paused_ms bigint,
  created_at timestamptz,
  updated_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    t.id, t.subject, t.description, t.status, t.priority, t.channel,
    t.requester_id, t.assignee_id, t.team_id, t.category_id, t.sla_policy_id,
    t.first_response_at, t.resolved_at, t.due_at, t.sla_paused_at, t.sla_paused_ms,
    t.created_at, t.updated_at,
    1 - (t.embedding OPERATOR(extensions.<=>) src.embedding) as similarity
  from public.tickets t
  cross join (
    select embedding from public.tickets where id = p_ticket_id
  ) src
  where t.id <> p_ticket_id
    and t.embedding is not null
    and src.embedding is not null
  order by t.embedding OPERATOR(extensions.<=>) src.embedding
  limit greatest(match_count, 0);
$$;
