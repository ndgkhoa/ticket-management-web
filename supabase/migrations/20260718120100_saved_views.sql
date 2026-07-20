-- Saved ticket-list views: named snapshots of the list's URL params, owned by a user and optionally
-- shared. Server-side (not localStorage) so views sync across devices and a shared one reaches the team.

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  -- Owner; defaults to the caller (insert policy pins it to auth.uid() regardless). Cascades on account delete.
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- The whole TicketSearch object. jsonb, not typed columns: a view only round-trips it back into
  -- the URL and the db never queries inside it, so the param shape stays the app's to evolve.
  search jsonb not null,
  -- Shared views are readable by every authenticated user; private ones only by the owner.
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

create index saved_views_user_idx on public.saved_views (user_id);
-- Shared views are read across users, so an index on the flag pays off as the table grows.
create index saved_views_shared_idx on public.saved_views (is_shared) where is_shared;

alter table public.saved_views enable row level security;

-- Read your own views always; anyone's shared views too.
create policy saved_views_select on public.saved_views
for select to authenticated
using (user_id = (select auth.uid()) or is_shared);

-- Create only as yourself — the flag can be set on insert, but the owner cannot be forged.
create policy saved_views_insert on public.saved_views
for insert to authenticated
with check (user_id = (select auth.uid()));

-- Only the owner edits (rename, toggle sharing); the check prevents reassigning ownership in the same update.
create policy saved_views_update on public.saved_views
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Only the owner deletes; a shared view is still the owner's to remove, others only read it.
create policy saved_views_delete on public.saved_views
for delete to authenticated
using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.saved_views to authenticated;
