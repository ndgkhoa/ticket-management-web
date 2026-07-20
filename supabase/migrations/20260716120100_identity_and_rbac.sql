-- Identity + global RBAC (roles → permissions), and the helpers every RLS policy is built on.

-- Mirror of auth.users (Supabase-owned, not exposed to PostgREST) so a ticket can join a profile
-- to show "who requested this".
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Unique: mirrors the unique `auth.users.email`, so email-based author lookups stay unambiguous.
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  -- System roles are seeded and load-bearing for RLS; the admin UI must not delete them.
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

-- Reverse-direction indexes for "who has this role?" / "which roles grant this permission?"
-- (the RBAC admin screens); the PKs already cover the forward lookups.
create index role_permissions_permission_idx on public.role_permissions (permission_id);
create index user_roles_role_idx on public.user_roles (role_id);

-- Does `uid` hold `permission_code` through any of their roles?
-- security definer is mandatory: it's called from the RLS policies on user_roles/role_permissions,
-- so invoker rights would re-enter those policies and recurse; it leaks nothing (one boolean).
-- `search_path = ''` + qualified names closes the definer schema-hijack hole.
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

-- `is_team_member()` (sibling helper) lives with the teams migration: a sql body is parsed at
-- creation, so it can't precede the table it reads.

-- Keep a profile in step with the auth user. A trigger, not app code: OAuth sign-ups bypass our
-- sign-up path, so a client-side insert would never run for a Google login.
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
    -- Google returns `name`, email sign-up sets `full_name`; neither guaranteed, hence the fallback.
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;

  -- Every new account is a customer, else it lands with zero roles and can do nothing.
  -- Role is pinned here, not read from `raw_user_meta_data` (attacker-controlled at signup, so
  -- trusting it would let anyone register as owner); agent/admin are granted later by an admin.
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

-- Sync the profile email with the account. GoTrue owns/verifies email changes; without this sync
-- `profiles.email` degrades into a stale copy of an address the user may no longer control.
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

-- `profiles.email` mirrors `auth.users.email`; no client session may write it. The self-update
-- policy would otherwise let a user set their email to another's and spoof identity, and RLS can't
-- defend a single column — so the column is guarded here. Verification stays in GoTrue.
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

-- Scoped to client sessions: the sync trigger (supabase_admin) and the seed (postgres) must stay
-- able to write the column they are the source of truth for.
create trigger profiles_email_immutable
before update on public.profiles
for each row
when (current_user not in ('postgres', 'supabase_admin'))
execute function public.enforce_profile_email_immutable();
