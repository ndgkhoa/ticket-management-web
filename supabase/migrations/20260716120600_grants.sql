-- Table privileges for the API roles. RLS and GRANT are independent gates a query must both pass:
-- the grant lets the role touch the table, the policy decides which rows. Written explicitly rather
-- than leaning on Supabase's default privileges, which depend on which role ran the migration.
--
-- `anon` ends up granted nothing — but granting nothing ≠ revoking. postgres-created tables inherit
-- a default ACL that hands anon/authenticated a TRUNCATE privilege, and RLS doesn't apply to TRUNCATE,
-- so those defaults would let an unauthenticated caller empty a table it can't read a row from.
-- No route emits TRUNCATE today (a landmine, not a live breach); this revoke closes it.
revoke all on all tables in schema public from anon, authenticated;

-- Same for the tables later migrations add, so this file keeps describing reality.
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant usage on schema public to authenticated;

-- Profiles: no INSERT — rows come from the security-definer `on_auth_user_created` trigger only.
grant select, update, delete on public.profiles to authenticated;

-- RBAC catalogue. Writes are gated by `*.manage` permissions in the policies; grants only make the attempt possible.
grant select, insert, update, delete on public.roles to authenticated;
grant select, insert, update, delete on public.permissions to authenticated;
grant select, insert, update, delete on public.role_permissions to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;

grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.sla_policies to authenticated;
grant select, insert, update, delete on public.canned_responses to authenticated;

grant select, insert, update, delete on public.tickets to authenticated;
grant select, insert, update, delete on public.ticket_tags to authenticated;

-- No UPDATE/DELETE: the message timeline is immutable. Policy already withheld; withholding the
-- grant too means editing history needs two separate mistakes.
grant select, insert on public.ticket_messages to authenticated;

grant select, insert, delete on public.attachments to authenticated;

-- Append-only audit trail, same reasoning as messages.
grant select, insert on public.ticket_events to authenticated;

-- Functions default to EXECUTE for PUBLIC, so anon could call the security-definer helpers and probe
-- any user's RBAC state. Revoke, then grant back to `authenticated` only (its policies evaluate as
-- that role, so it must be able to execute the helpers they call).
revoke all on function public.has_permission(uuid, text) from public, anon;
revoke all on function public.is_team_member(uuid, uuid) from public, anon;
revoke all on function public.can_access_ticket(uuid, uuid, uuid, uuid) from public, anon;

grant execute on function public.has_permission(uuid, text) to authenticated;
grant execute on function public.is_team_member(uuid, uuid) to authenticated;
grant execute on function public.can_access_ticket(uuid, uuid, uuid, uuid) to authenticated;
