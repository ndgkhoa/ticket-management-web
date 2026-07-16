-- Identity + global RBAC (roles → permissions), and the helpers every RLS policy
-- in this schema is built on.

-- Mirror of auth.users that the app may actually join against. `auth.users` is
-- owned by Supabase and not exposed to PostgREST, so a public profile row is the
-- only way a ticket can display "who requested this".
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Unique because `auth.users.email` is unique and this mirrors it. Without the
  -- constraint two profiles can claim one address, and every "who wrote this?"
  -- lookup by email becomes ambiguous.
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  -- System roles are seeded and load-bearing for RLS; the admin UI must not offer
  -- to delete them.
  is_system boolean not null default false
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  -- Dotted verb codes (`ticket.assign`), matched by `has_permission()`.
  code text not null unique,
  description text
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  primary key (user_id, role_id)
);

-- The PK covers (role_id, ...) / (user_id, ...) lookups. These cover the reverse
-- direction, which is what "who has this role?" and "which roles grant this
-- permission?" ask — and what the RBAC admin screens are made of.
create index role_permissions_permission_idx on public.role_permissions (permission_id);
create index user_roles_role_idx on public.user_roles (role_id);

-- Does `uid` hold `permission_code` through any of their roles?
--
-- security definer is mandatory, not an optimization: this function is called from
-- the RLS policies ON user_roles/role_permissions themselves. An invoker-rights
-- function would re-enter those policies and recurse infinitely. Running as owner
-- bypasses RLS on the tables it reads, which is safe here because the function
-- answers exactly one boolean about the uid it was handed and leaks no rows.
--
-- `set search_path = ''` with fully-qualified names closes the classic definer
-- hole: without it, a caller can prepend a schema of their own and hijack which
-- `permissions` table this reads.
create or replace function public.has_permission(uid uuid, permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = uid
      and p.code = permission_code
  );
$$;

-- `is_team_member()` is the sibling of this helper but lives with the teams
-- migration: a `language sql` body is parsed at creation time, so it cannot be
-- declared before the table it reads exists.

-- Keep a profile in step with the auth user. A trigger rather than an app-side
-- insert: OAuth sign-ups never touch our sign-up code path, so anything the client
-- is responsible for would simply not run for a Google login.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    -- Google returns `name`; email sign-up puts whatever the form collected in
    -- `full_name`. Neither is guaranteed, hence the fallback chain.
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;

  -- Every new account is a customer. Without this a signup lands with a profile and
  -- zero roles, which `has_permission()` reads as "may do nothing at all" — the user
  -- cannot even open the ticket they signed up to open. Seeded accounts get their
  -- roles explicitly, so nothing in the demo would ever surface the gap.
  --
  -- Self-signup can only ever be a customer; agent and admin are granted by an
  -- existing admin. The role is pinned here rather than read from metadata because
  -- `raw_user_meta_data` is attacker-controlled at signup — trusting it would let
  -- anyone register as an owner.
  insert into public.user_roles (user_id, role_id)
  select new.id, r.id
  from public.roles r
  where r.name = 'customer'
  on conflict (user_id, role_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Keep the profile email in step with the account. GoTrue owns email changes because
-- it is the thing that verifies them; without this sync `profiles.email` degrades
-- into a stale copy of an address the user may no longer control.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row
execute function public.handle_user_email_change();

-- `profiles.email` mirrors `auth.users.email`; no client session may write it.
--
-- The profiles UPDATE policy lets you edit your own profile, which is correct and
-- also means it lets you set your own email to `admin@demo.local`. Every screen that
-- identifies a requester or author by email would then render your messages as the
-- admin's — identity spoofing with one PATCH, no permission required. RLS is
-- row-level and cannot defend a single column, so the column is defended here.
--
-- Verification of a new address stays where it belongs: GoTrue. This trigger only
-- refuses the shortcut around it.
create or replace function public.enforce_profile_email_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    raise exception 'profiles.email is managed by auth and cannot be changed directly'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- Scoped to client sessions. The sync trigger above runs as `supabase_admin` (it is
-- security definer), and the seed runs as `postgres` — both must remain able to set
-- the column they are the source of truth for.
create trigger profiles_email_immutable
before update on public.profiles
for each row
when (current_user not in ('postgres', 'supabase_admin'))
execute function public.enforce_profile_email_immutable();
