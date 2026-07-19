-- Teams, and the classification tables a ticket is filed under.

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (team_id, user_id)
);

-- The PK indexes (team_id, ...); this covers "which teams is this agent in?",
-- which is the direction `is_team_member()` and the tickets RLS policy read.
create index team_members_user_idx on public.team_members (user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- Hex colour driving the tag chip. Constrained because the value is rendered
  -- straight into a style attribute, and "whatever the admin typed" is how a CSS
  -- injection gets in.
  color text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$')
);

-- Declared here rather than with the other RBAC helpers: a `language sql` body is
-- parsed at creation time, so it cannot reference team_members before that table
-- exists.
--
-- security definer for the same reason as `has_permission()` — it is called from
-- the RLS policy on tickets, and team_members carries policies of its own that
-- would otherwise re-enter. It returns one boolean about the uid it was handed, so
-- owner rights leak nothing.
create or replace function public.is_team_member(uid uuid, target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.user_id = uid
      and tm.team_id = target_team_id
  );
$$;
