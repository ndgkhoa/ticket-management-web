-- SLA policies and canned responses.
--
-- Ahead of the ticket tables because `tickets.sla_policy_id` references this one.

create table public.sla_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- One policy per priority is the rule the ticket workflow applies: a ticket
  -- picks up the policy matching its priority. Unique keeps that lookup
  -- single-valued instead of "whichever row came back first".
  priority public.ticket_priority not null unique,
  first_response_mins integer not null check (first_response_mins > 0),
  resolution_mins integer not null check (resolution_mins > 0),
  -- Resolution can never be due before first response; an SLA that breaches the
  -- moment it is created is a data-entry bug, not a policy.
  check (resolution_mins >= first_response_mins)
);

create table public.canned_responses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  -- Survives its author leaving: the response is team knowledge, so deleting the
  -- profile nulls the credit rather than destroying the content.
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index canned_responses_created_by_idx on public.canned_responses (created_by);
