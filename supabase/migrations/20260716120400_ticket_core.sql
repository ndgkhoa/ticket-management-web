-- The ticket hub and everything hanging off it: tags, messages, attachments, and
-- the event timeline.

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (length(trim(subject)) > 0),
  description text not null default '',
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'normal',
  channel public.ticket_channel not null default 'web',

  -- `restrict`: a ticket needs a requester, so deleting the account must first resolve its history.
  requester_id uuid not null references public.profiles (id) on delete restrict,
  -- Unassigned is a common state; an agent leaving returns their tickets to the queue.
  assignee_id uuid references public.profiles (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  sla_policy_id uuid references public.sla_policies (id) on delete set null,

  -- Stamped once, on the first agent public reply; the SLA clock reads it, so later replies must not move it.
  first_response_at timestamptz,
  resolved_at timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Keyword search. Generated (not a trigger) so no write path can forget it. 'simple' not
  -- 'english': content is mixed en/vi and the English stemmer mangles Vietnamese. Weights rank
  -- a subject hit over a description hit.
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored,

  -- Semantic search, populated later. 1536 not the provider's 3072 default: pgvector's hnsw/ivfflat
  -- indexes cap at 2000 dims. Gemini embeddings are Matryoshka, so truncating to 1536 is lossless.
  embedding extensions.vector(1536)
);

create table public.ticket_tags (
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (ticket_id, tag_id)
);

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  type public.message_type not null default 'public_reply',
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  -- Null = attached to the ticket itself rather than to a specific reply.
  message_id uuid references public.ticket_messages (id) on delete cascade,
  file_url text not null,
  file_name text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Audit trail behind the ticket timeline. Append-only: no update/delete policy in the RLS migration.
create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type public.ticket_event_type not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Search & filter indexes. The list filters, sorts and searches server-side on every keystroke;
-- without these each one is a sequential scan.

create index tickets_search_vector_idx on public.tickets using gin (search_vector);

-- Fuzzy fallback for typos/partial words ("payme", "invioce") that lexeme-based full-text search misses.
create index tickets_subject_trgm_idx on public.tickets using gin (subject extensions.gin_trgm_ops);

-- Semantic search index; cosine distance to match the embedding model's own similarity metric.
create index tickets_embedding_idx on public.tickets using hnsw (embedding extensions.vector_cosine_ops);

-- The default list (no filter, `created_at desc, id desc`, first page) — the most-run query, which
-- the filtered indexes below can't serve (they all lead with an equality column it doesn't supply).
-- The id tiebreaker is in the index: offset pagination over a non-total order skips/duplicates rows.
create index tickets_created_id_idx on public.tickets (created_at desc, id desc);

-- (equality column, created_at desc): a B-tree serves the sort only when the equality column leads.
create index tickets_status_created_idx on public.tickets (status, created_at desc);
create index tickets_priority_created_idx on public.tickets (priority, created_at desc);
-- Partial: most tickets are unassigned/unteamed and shouldn't bloat an "assigned to X" index.
create index tickets_assignee_created_idx on public.tickets (assignee_id, created_at desc)
  where assignee_id is not null;
create index tickets_team_created_idx on public.tickets (team_id, created_at desc)
  where team_id is not null;
-- Also the customer RLS lookup path; an unindexed policy column is a whole-table cost per read.
create index tickets_requester_created_idx on public.tickets (requester_id, created_at desc);

create index ticket_tags_tag_idx on public.ticket_tags (tag_id);
create index ticket_messages_ticket_created_idx on public.ticket_messages (ticket_id, created_at);
create index ticket_events_ticket_created_idx on public.ticket_events (ticket_id, created_at);
create index attachments_ticket_idx on public.attachments (ticket_id);
create index attachments_message_idx on public.attachments (message_id) where message_id is not null;

-- The single definition of ticket visibility, shared by the SELECT and UPDATE/DELETE policies.
-- A function because Postgres won't derive one from the other: a SELECT policy constrains an UPDATE
-- only when the statement reads columns, so `update tickets set priority='urgent'` (reads none) would
-- match every row. Naming the predicate once keeps them from drifting. Not security definer — it
-- reads no tables, delegating the definer rights it needs to has_permission()/is_team_member().
create or replace function public.can_access_ticket(
  uid uuid,
  ticket_requester_id uuid,
  ticket_assignee_id uuid,
  ticket_team_id uuid
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    -- Your own ticket (the customer path).
    ticket_requester_id = uid
    -- Everything (admin/owner).
    or public.has_permission(uid, 'ticket.read.all')
    -- Yours or your team's (the agent path).
    or (
      public.has_permission(uid, 'ticket.read.team')
      and (
        ticket_assignee_id = uid
        or (ticket_team_id is not null and public.is_team_member(uid, ticket_team_id))
      )
    );
$$;

-- `updated_at` maintained in-db, not by callers: a client that forgets it silently corrupts sort-by-updated.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_set_updated_at
before update on public.tickets
for each row
execute function public.set_updated_at();
