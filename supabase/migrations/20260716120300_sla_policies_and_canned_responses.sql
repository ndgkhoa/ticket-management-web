create table public.sla_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  priority public.ticket_priority not null unique,
  first_response_mins integer not null check (first_response_mins > 0),
  resolution_mins integer not null check (resolution_mins > 0),
  check (resolution_mins >= first_response_mins)
);

create table public.canned_responses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index canned_responses_created_by_idx on public.canned_responses (created_by);
