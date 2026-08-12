create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (length(trim(subject)) > 0),
  description text not null default '',
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'normal',
  channel public.ticket_channel not null default 'web',

  -- `restrict`, unlike the nullable roles below: a ticket cannot exist without its requester
  requester_id uuid not null references public.profiles (id) on delete restrict,
  assignee_id uuid references public.profiles (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  sla_policy_id uuid references public.sla_policies (id) on delete set null,

  -- Write-once: the SLA clock reads it, so replies after the first must not move it
  first_response_at timestamptz,
  resolved_at timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 'simple', not 'english': content is mixed en/vi and the English stemmer breaks Vietnamese
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored,

  -- 1536, not the model's 3072 default: pgvector's hnsw index caps at 2000 dimensions
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
  message_id uuid references public.ticket_messages (id) on delete cascade,
  file_url text not null,
  file_name text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type public.ticket_event_type not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index tickets_search_vector_idx on public.tickets using gin (search_vector);

create index tickets_subject_trgm_idx on public.tickets using gin (subject extensions.gin_trgm_ops);

create index tickets_embedding_idx on public.tickets using hnsw (embedding extensions.vector_cosine_ops);

create index tickets_created_id_idx on public.tickets (created_at desc, id desc);

-- (filter column, created_at desc): a B-tree serves the list's sort only when equality leads
create index tickets_status_created_idx on public.tickets (status, created_at desc);
create index tickets_priority_created_idx on public.tickets (priority, created_at desc);
create index tickets_assignee_created_idx on public.tickets (assignee_id, created_at desc)
  where assignee_id is not null;
create index tickets_team_created_idx on public.tickets (team_id, created_at desc)
  where team_id is not null;
create index tickets_requester_created_idx on public.tickets (requester_id, created_at desc);

create index ticket_tags_tag_idx on public.ticket_tags (tag_id);
create index ticket_messages_ticket_created_idx on public.ticket_messages (ticket_id, created_at);
create index ticket_events_ticket_created_idx on public.ticket_events (ticket_id, created_at);
create index attachments_ticket_idx on public.attachments (ticket_id);
create index attachments_message_idx on public.attachments (message_id) where message_id is not null;

-- One shared definition of visibility, so the SELECT and UPDATE/DELETE policies cannot drift apart
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
    ticket_requester_id = uid
    or public.has_permission(uid, 'ticket.read.all')
    or (
      public.has_permission(uid, 'ticket.read.team')
      and (
        ticket_assignee_id = uid
        or (ticket_team_id is not null and public.is_team_member(uid, ticket_team_id))
      )
    );
$$;

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
