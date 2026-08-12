create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- The list's whole search object; the db never queries inside it, so the app owns its shape
  search jsonb not null,
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

create index saved_views_user_idx on public.saved_views (user_id);
create index saved_views_shared_idx on public.saved_views (is_shared) where is_shared;

alter table public.saved_views enable row level security;

create policy saved_views_select on public.saved_views
for select to authenticated
using (user_id = (select auth.uid()) or is_shared);

create policy saved_views_insert on public.saved_views
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy saved_views_update on public.saved_views
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy saved_views_delete on public.saved_views
for delete to authenticated
using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.saved_views to authenticated;
