-- Semantic search over the ticket embeddings populated by the AI phase.
--
-- The `embedding vector(1536)` column and its hnsw (cosine) index already exist on
-- `public.tickets` (see the ticket-core migration). This adds the two read paths the
-- UI needs: a free-text semantic search, and a "tickets like this one" lookup.
--
-- Both run `security invoker`, which is the whole safety model: the SELECT executes as
-- the caller, so the `tickets` RLS policy decides every row. Semantic search can never
-- surface a ticket the caller could not already read through the list.
--
-- Operators are written `OPERATOR(extensions.<=>)` and types qualified `extensions.vector`
-- because these functions pin `search_path = ''` (an unqualified `<=>` would not resolve
-- when the caller's search_path omits `extensions`). `<=>` is cosine distance, matching
-- the model's own similarity metric and the hnsw index's `vector_cosine_ops`, so the
-- index actually serves the ORDER BY. Similarity is reported as `1 - distance` so a
-- higher number means more similar — the direction a UI expects.

-- Free-text semantic search: rank visible tickets by cosine similarity to a query
-- embedding. The query vector is produced server-side (the `embed-query` edge function
-- holds the API key); the client passes it straight into this RPC so RLS still applies.
create or replace function public.match_tickets(
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
    t.first_response_at, t.resolved_at, t.due_at, t.created_at, t.updated_at,
    1 - (t.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.tickets t
  where t.embedding is not null
    and 1 - (t.embedding OPERATOR(extensions.<=>) query_embedding) >= similarity_threshold
  order by t.embedding OPERATOR(extensions.<=>) query_embedding
  limit greatest(match_count, 0);
$$;

grant execute on function public.match_tickets(extensions.vector, integer, double precision)
  to authenticated;

-- "Similar tickets" for the detail sidebar: neighbours of a ticket's own stored
-- embedding, so it costs one index lookup and zero API calls. The source ticket is read
-- through RLS too (the caller is already viewing it), and it is excluded from its own
-- results.
create or replace function public.similar_tickets(
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
    t.first_response_at, t.resolved_at, t.due_at, t.created_at, t.updated_at,
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

grant execute on function public.similar_tickets(uuid, integer) to authenticated;
