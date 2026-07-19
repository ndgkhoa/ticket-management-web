-- Saved ticket-list views: named snapshots of the list's URL search params, owned by a
-- user and optionally shared with everyone. Server-side (not localStorage) so a view syncs
-- across a user's devices and a shared one is visible to the whole team.

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  -- Owner. Defaults to the caller so a client need not send it; the insert policy still
  -- pins it to auth.uid() either way. Cascades so a deleted account takes its views with it.
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  -- The whole TicketSearch object (filters, sort, page size). jsonb, not typed columns:
  -- the list's param shape is the app's to evolve, and a view only ever round-trips it back
  -- into the URL — the database never queries inside it.
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

-- Only the owner edits (rename, toggle sharing); the check keeps ownership from being
-- reassigned to someone else in the same update.
create policy saved_views_update on public.saved_views
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Only the owner deletes. A shared view is still the owner's to remove; other users read
-- it, they don't manage it.
create policy saved_views_delete on public.saved_views
for delete to authenticated
using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.saved_views to authenticated;
