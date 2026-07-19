-- The ticket hub and everything hanging off it: tags, messages, attachments, and
-- the event timeline.

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (length(trim(subject)) > 0),
  description text not null default '',
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'normal',
  channel public.ticket_channel not null default 'web',

  -- A ticket without a requester is meaningless, so the profile cannot simply
  -- vanish underneath it. `restrict` forces the caller to decide what happens to
  -- the history before deleting the account.
  requester_id uuid not null references public.profiles (id) on delete restrict,
  -- Unassigned is a real, common state, and an agent leaving returns their tickets
  -- to the queue rather than deleting them.
  assignee_id uuid references public.profiles (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  sla_policy_id uuid references public.sla_policies (id) on delete set null,

  -- Stamped once, when the first public reply from an agent lands: the SLA clock
  -- reads this, so a later reply must not move it.
  first_response_at timestamptz,
  resolved_at timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Keyword search. A generated column rather than a trigger — Postgres keeps it
  -- in sync, so no write path can forget it.
  --
  -- 'simple' rather than 'english': the content is mixed en/vi and the English
  -- stemmer mangles Vietnamese. Weights make a subject hit outrank a description
  -- hit when ranking.
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored,

  -- Semantic search, populated later by the AI phase. 1536 and not the provider's
  -- 3072 default: pgvector's hnsw/ivfflat indexes cap at 2000 dimensions, so a
  -- 3072-dim column would work on seed data and then fail to index at all. Gemini
  -- embeddings are Matryoshka, so truncating to 1536 is lossless by design.
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

-- Audit trail behind the ticket timeline. Append-only by intent: no update/delete
-- policy is granted in the RLS migration.
create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type public.ticket_event_type not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Search & filter indexes.
--
-- The list filters, sorts and searches server-side on every keystroke; without
-- these each one is a sequential scan.

create index tickets_search_vector_idx on public.tickets using gin (search_vector);

-- Fuzzy fallback for what people actually type ("payme", "invioce") — full-text
-- search matches lexemes, so it misses partial words and typos entirely.
create index tickets_subject_trgm_idx on public.tickets using gin (subject extensions.gin_trgm_ops);

-- Semantic search index. Cosine distance to match the embedding model's own
-- similarity metric.
create index tickets_embedding_idx on public.tickets using hnsw (embedding extensions.vector_cosine_ops);

-- The default list: no filter, `created_at desc, id desc`, first page. It is the
-- single most-run query in the product and every filtered index below is useless to
-- it — they all lead with an equality column that this query does not supply. The
-- tiebreaker is part of the index, not just the ORDER BY: offset pagination over a
-- non-total order silently duplicates and skips rows between pages.
create index tickets_created_id_idx on public.tickets (created_at desc, id desc);

-- Composite order is (equality column, sort column desc): a B-tree can only serve
-- the sort if the equality columns lead. The list's default order is
-- `created_at desc, id desc`, scoped by whichever filter is active.
create index tickets_status_created_idx on public.tickets (status, created_at desc);
create index tickets_priority_created_idx on public.tickets (priority, created_at desc);
-- Partial: most tickets are unassigned/unteamed, and those rows have no business
-- bloating an index that only ever answers "assigned to X".
create index tickets_assignee_created_idx on public.tickets (assignee_id, created_at desc)
  where assignee_id is not null;
create index tickets_team_created_idx on public.tickets (team_id, created_at desc)
  where team_id is not null;
-- Doubles as the customer RLS lookup path. RLS predicates run against every row of
-- every query, so an unindexed policy column is a whole-table cost on each read.
create index tickets_requester_created_idx on public.tickets (requester_id, created_at desc);

create index ticket_tags_tag_idx on public.ticket_tags (tag_id);
create index ticket_messages_ticket_created_idx on public.ticket_messages (ticket_id, created_at);
create index ticket_events_ticket_created_idx on public.ticket_events (ticket_id, created_at);
create index attachments_ticket_idx on public.attachments (ticket_id);
create index attachments_message_idx on public.attachments (message_id) where message_id is not null;

-- Who may touch this ticket at all — the single definition of ticket visibility.
--
-- It exists as a function because the same predicate is needed by both the SELECT
-- and the UPDATE/DELETE policies, and Postgres will NOT derive one from the other:
-- a SELECT policy constrains an UPDATE only when the statement reads columns. An
-- unqualified `update tickets set priority='urgent'` reads nothing, so a
-- permission-only UPDATE policy matches every row in the table — including the ones
-- the caller cannot see. Restating the predicate by hand in each policy is how the
-- two drift apart; naming it once is how they cannot.
--
-- Not security definer: it reads no tables directly. The definer-ness it needs comes
-- from `has_permission()` and `is_team_member()`, which it delegates to.
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

-- `updated_at` maintained in the database, not by callers: every client that
-- forgets it silently corrupts sort-by-recently-updated, and there is no way to
-- tell after the fact.
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
