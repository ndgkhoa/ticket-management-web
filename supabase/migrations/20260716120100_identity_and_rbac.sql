-- Mirror of `auth.users`, which Supabase owns and PostgREST cannot join against
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
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

create index role_permissions_permission_idx on public.role_permissions (permission_id);
create index user_roles_role_idx on public.user_roles (role_id);

-- security definer is mandatory: the RLS policies on `user_roles` call this and would recurse
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

-- A trigger, not app code: an OAuth sign-up never passes through our own sign-up path
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
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;

  -- Pinned to `customer`, never read from signup metadata, which the caller controls
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

-- Email is auth-owned; without this the self-update policy would let a user spoof another identity
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

-- Client sessions only: the sync trigger and the seed still write the column they own
create trigger profiles_email_immutable
before update on public.profiles
for each row
when (current_user not in ('postgres', 'supabase_admin'))
execute function public.enforce_profile_email_immutable();
