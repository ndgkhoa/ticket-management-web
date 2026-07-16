-- Table privileges for the API roles.
--
-- RLS and GRANT are two independent gates and a query must pass both: the grant
-- decides whether the role may touch the table at all, the policy decides which
-- rows come back. Policies without grants — the state this migration fixes — deny
-- everything with "permission denied for table", which reads like a client bug and
-- is not one.
--
-- Written out explicitly rather than leaning on Supabase's default privileges.
-- Default privileges depend on which role ran the migration, so relying on them is
-- how a schema works locally and then locks everyone out of the hosted project.
--
-- `anon` ends up granted nothing at all. Every read here requires a session, and the
-- pairing of "no grant" with "no policy" means an unauthenticated request has to
-- get through two independent failures to see a row.
--
-- "Ends up", because granting nothing is not the same as revoking. Tables created by
-- `postgres` inherit that role's default ACL, which on Supabase hands `anon` and
-- `authenticated` a TRUNCATE privilege (`Dxtm/postgres`) on arrival. RLS does not
-- apply to TRUNCATE — it is not a row operation — so those defaults let an
-- unauthenticated caller empty a table that has no policy permitting them to read a
-- single row from it. No PostgREST route emits TRUNCATE today, which makes this a
-- landmine rather than a live breach; the fix is to stop it being either.
revoke all on all tables in schema public from anon, authenticated;

-- Same treatment for the tables later migrations will add. Without this, the file
-- below stops describing reality the moment someone adds table 17.
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant usage on schema public to authenticated;

-- Profiles: no INSERT. Rows come from the `on_auth_user_created` trigger, which
-- runs as definer — nothing else may invent one.
grant select, update, delete on public.profiles to authenticated;

-- RBAC catalogue. Writes are gated by the `*.manage` permissions in the policies;
-- the grants merely make the attempt possible.
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

-- No UPDATE or DELETE, deliberately: the message timeline is the record of what was
-- said. The RLS migration already withholds those policies; withholding the grant
-- too means editing history needs two separate mistakes to become possible.
grant select, insert on public.ticket_messages to authenticated;

grant select, insert, delete on public.attachments to authenticated;

-- Append-only audit trail, same reasoning as messages.
grant select, insert on public.ticket_events to authenticated;

-- Functions are created with EXECUTE granted to PUBLIC, so these are callable by
-- `anon` — and `has_permission()` is security definer, meaning an unauthenticated
-- caller could probe the RBAC state of any user id they can guess. Revoke first, then
-- grant back only to the role that needs it.
--
-- Policy expressions are evaluated as the querying role, so `authenticated` must be
-- able to execute the helpers its own policies call.
revoke all on function public.has_permission(uuid, text) from public, anon;
revoke all on function public.is_team_member(uuid, uuid) from public, anon;
revoke all on function public.can_access_ticket(uuid, uuid, uuid, uuid) from public, anon;

grant execute on function public.has_permission(uuid, text) to authenticated;
grant execute on function public.is_team_member(uuid, uuid) to authenticated;
grant execute on function public.can_access_ticket(uuid, uuid, uuid, uuid) to authenticated;
