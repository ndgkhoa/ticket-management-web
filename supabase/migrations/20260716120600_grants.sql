-- Table privileges for the API roles; RLS and GRANT are independent gates a query must both pass

-- Default ACLs hand `anon` a TRUNCATE privilege, which RLS does not cover
revoke all on all tables in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;

grant usage on schema public to authenticated;

grant select, update, delete on public.profiles to authenticated;

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

-- No UPDATE/DELETE on the timeline tables: editing history should need two separate mistakes
grant select, insert on public.ticket_messages to authenticated;

grant select, insert, delete on public.attachments to authenticated;

grant select, insert on public.ticket_events to authenticated;

-- Functions default to EXECUTE for PUBLIC, so `anon` could otherwise probe any user's RBAC state
revoke all on function public.has_permission(uuid, text) from public, anon;
revoke all on function public.is_team_member(uuid, uuid) from public, anon;
revoke all on function public.can_access_ticket(uuid, uuid, uuid, uuid) from public, anon;

grant execute on function public.has_permission(uuid, text) to authenticated;
grant execute on function public.is_team_member(uuid, uuid) to authenticated;
grant execute on function public.can_access_ticket(uuid, uuid, uuid, uuid) to authenticated;
