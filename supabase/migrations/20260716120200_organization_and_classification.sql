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

create index team_members_user_idx on public.team_members (user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- Constrained because the value is rendered into a style attribute
  color text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$')
);

-- Lives here, not with the other RBAC helpers: a sql body cannot reference `team_members` earlier
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
