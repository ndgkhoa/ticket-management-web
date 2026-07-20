-- Row level security for every table.
--   customer  — own tickets only, public replies only, never internal notes
--   agent     — tickets assigned to them or to their team, internal notes included
--   admin/own — everything
-- Writes gate on `has_permission()`, not a role name, so the permission matrix stays editable data.
--
-- Two deliberate conventions below:
--   `(select auth.uid())` not bare `auth.uid()` — hoisted into an InitPlan, evaluated once per
--   statement instead of once per row (500 calls on a 500-row page).
--   `exists (select 1 from public.tickets t where t.id = <fk>)` on child tables — that subquery is
--   itself under the tickets policy, so parent visibility is answered once, not restated per child.

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.sla_policies enable row level security;
alter table public.canned_responses enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_tags enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.attachments enable row level security;
alter table public.ticket_events enable row level security;

-- No `anon` policy anywhere: RLS denies by default, so an unauthenticated caller reads nothing (intentional).

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Four reasons a profile is visible: (1) yourself; (2) `user.read.all` for the user-admin screens;
-- (3) anyone on a ticket you can see (requester/assignee); (4) the staff roster, for an agent's
-- assignee picker. Branch 4 is scoped to team members (not granted `user.read.all`) so agents don't
-- get the whole customer list — customers are in no team. Trade-off: a customer sees the agent's
-- email (the address that emails them anyway); RLS can't hide a single column, that would need a view.
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or public.has_permission((select auth.uid()), 'user.read.all')
  -- Two separate EXISTS, not one OR: an OR across two columns can't use either index; split, each
  -- branch is an index lookup (tickets_requester_created_idx / tickets_assignee_created_idx).
  or exists (select 1 from public.tickets t where t.requester_id = public.profiles.id)
  or exists (select 1 from public.tickets t where t.assignee_id = public.profiles.id)
  or (
    public.has_permission((select auth.uid()), 'ticket.read.team')
    and exists (
      select 1
      from public.team_members tm
      where tm.user_id = public.profiles.id
    )
  )
);

-- No insert policy: rows arrive via the security-definer `on_auth_user_created` trigger only.

create policy profiles_update on public.profiles
for update to authenticated
using (id = (select auth.uid()) or public.has_permission((select auth.uid()), 'user.manage'))
with check (id = (select auth.uid()) or public.has_permission((select auth.uid()), 'user.manage'));

create policy profiles_delete on public.profiles
for delete to authenticated
using (public.has_permission((select auth.uid()), 'user.manage'));

-- ---------------------------------------------------------------------------
-- RBAC catalog
-- ---------------------------------------------------------------------------

-- The role/permission catalog is readable by any signed-in user: the client computes its own UI
-- permission set from it. Knowing a permission exists grants nothing; holding it (user_roles) does.
create policy roles_select on public.roles
for select to authenticated using (true);

create policy permissions_select on public.permissions
for select to authenticated using (true);

create policy role_permissions_select on public.role_permissions
for select to authenticated using (true);

create policy roles_write on public.roles
for all to authenticated
using (public.has_permission((select auth.uid()), 'role.manage'))
with check (public.has_permission((select auth.uid()), 'role.manage'));

create policy permissions_write on public.permissions
for all to authenticated
using (public.has_permission((select auth.uid()), 'permission.manage'))
with check (public.has_permission((select auth.uid()), 'permission.manage'));

create policy role_permissions_write on public.role_permissions
for all to authenticated
using (public.has_permission((select auth.uid()), 'role.manage'))
with check (public.has_permission((select auth.uid()), 'role.manage'));

-- Own grants readable so the app knows what to offer; others' need the user-admin permission. This
-- row decides authority, so it's the one RBAC table that is not world-readable.
create policy user_roles_select on public.user_roles
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_permission((select auth.uid()), 'user.read.all')
);

create policy user_roles_write on public.user_roles
for all to authenticated
using (public.has_permission((select auth.uid()), 'user.manage'))
with check (public.has_permission((select auth.uid()), 'user.manage'));

-- ---------------------------------------------------------------------------
-- Organization & classification
-- ---------------------------------------------------------------------------

-- Team/category/tag names are labels on tickets a customer already sees: readable to all
-- authenticated, writable only by the matching admin permission.

create policy teams_select on public.teams for select to authenticated using (true);
create policy teams_write on public.teams
for all to authenticated
using (public.has_permission((select auth.uid()), 'team.manage'))
with check (public.has_permission((select auth.uid()), 'team.manage'));

create policy team_members_select on public.team_members for select to authenticated using (true);
create policy team_members_write on public.team_members
for all to authenticated
using (public.has_permission((select auth.uid()), 'team.manage'))
with check (public.has_permission((select auth.uid()), 'team.manage'));

create policy categories_select on public.categories for select to authenticated using (true);
create policy categories_write on public.categories
for all to authenticated
using (public.has_permission((select auth.uid()), 'category.manage'))
with check (public.has_permission((select auth.uid()), 'category.manage'));

create policy tags_select on public.tags for select to authenticated using (true);
create policy tags_write on public.tags
for all to authenticated
using (public.has_permission((select auth.uid()), 'tag.manage'))
with check (public.has_permission((select auth.uid()), 'tag.manage'));

create policy sla_policies_select on public.sla_policies for select to authenticated using (true);
create policy sla_policies_write on public.sla_policies
for all to authenticated
using (public.has_permission((select auth.uid()), 'sla.manage'))
with check (public.has_permission((select auth.uid()), 'sla.manage'));

-- Canned responses are agent-facing tooling; a customer has no reason to read the reply library.
create policy canned_responses_select on public.canned_responses
for select to authenticated
using (public.has_permission((select auth.uid()), 'canned.read'));

create policy canned_responses_write on public.canned_responses
for all to authenticated
using (public.has_permission((select auth.uid()), 'canned.manage'))
with check (public.has_permission((select auth.uid()), 'canned.manage'));

-- ---------------------------------------------------------------------------
-- tickets
-- ---------------------------------------------------------------------------

-- The core ticket policy. The predicate lives in `can_access_ticket()` so SELECT/UPDATE/DELETE
-- can't disagree on what "visible" means — see that function for why sharing it is mandatory.
create policy tickets_select on public.tickets
for select to authenticated
using (public.can_access_ticket((select auth.uid()), requester_id, assignee_id, team_id));

-- A customer files only as themselves; agents may file on behalf of a requester (how phone/email
-- tickets get in), gated on the same permission that lets them edit tickets.
create policy tickets_insert on public.tickets
for insert to authenticated
with check (
  public.has_permission((select auth.uid()), 'ticket.create')
  and (
    requester_id = (select auth.uid())
    or public.has_permission((select auth.uid()), 'ticket.update')
  )
);

-- Customers get no update path: status/priority/assignment are agent decisions, and RLS can't
-- restrict individual columns. `can_access_ticket` in USING is the only thing scoping the UPDATE to
-- visible rows — Postgres applies the SELECT policy to an UPDATE only when it reads columns, so a
-- permission-only USING would match every row (`update tickets set priority='urgent'` reads none).
create policy tickets_update on public.tickets
for update to authenticated
using (
  public.has_permission((select auth.uid()), 'ticket.update')
  and public.can_access_ticket((select auth.uid()), requester_id, assignee_id, team_id)
)
-- WITH CHECK is permission-only, not scoped: reassigning to another team produces a row the agent
-- can no longer see; scoping the check would forbid that handoff.
with check (public.has_permission((select auth.uid()), 'ticket.update'));

-- Scoped like UPDATE. Harmless today (only admin/owner hold `ticket.delete` and see everything),
-- but an unscoped USING would mean "delete the entire table" the day a team-scoped delete role exists.
create policy tickets_delete on public.tickets
for delete to authenticated
using (
  public.has_permission((select auth.uid()), 'ticket.delete')
  and public.can_access_ticket((select auth.uid()), requester_id, assignee_id, team_id)
);

create policy ticket_tags_select on public.ticket_tags
for select to authenticated
using (exists (select 1 from public.tickets t where t.id = ticket_id));

create policy ticket_tags_write on public.ticket_tags
for all to authenticated
using (
  public.has_permission((select auth.uid()), 'ticket.update')
  and exists (select 1 from public.tickets t where t.id = ticket_id)
)
with check (
  public.has_permission((select auth.uid()), 'ticket.update')
  and exists (select 1 from public.tickets t where t.id = ticket_id)
);

-- ---------------------------------------------------------------------------
-- ticket_messages
-- ---------------------------------------------------------------------------

-- The internal-note boundary. Ticket visibility is inherited from the tickets policy; this adds the
-- message-specific rule: an internal note is invisible without the permission to read it.
create policy ticket_messages_select on public.ticket_messages
for select to authenticated
using (
  exists (select 1 from public.tickets t where t.id = ticket_id)
  and (
    type = 'public_reply'
    or public.has_permission((select auth.uid()), 'message.read.internal')
  )
);

-- `author_id` is pinned to the caller so a reply can't be forged in someone else's name. Internal
-- notes need their own permission, so a customer can't post one by passing `type: 'internal_note'`.
create policy ticket_messages_insert on public.ticket_messages
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.tickets t where t.id = ticket_id)
  and (
    type = 'public_reply'
    or public.has_permission((select auth.uid()), 'message.create.internal')
  )
);

-- No update/delete policy: the message timeline is the record of what was said, and RLS
-- deny-by-default keeps it immutable.

-- ---------------------------------------------------------------------------
-- attachments
-- ---------------------------------------------------------------------------

create policy attachments_select on public.attachments
for select to authenticated
using (
  exists (select 1 from public.tickets t where t.id = ticket_id)
  -- An attachment on an internal note inherits its invisibility, else name/URL leak the note's existence.
  and (
    message_id is null
    or exists (select 1 from public.ticket_messages m where m.id = message_id)
  )
);

create policy attachments_insert on public.attachments
for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (select 1 from public.tickets t where t.id = ticket_id)
);

-- Deleting your own upload covers "wrong file"; anything broader belongs to ticket administration.
create policy attachments_delete on public.attachments
for delete to authenticated
using (
  uploaded_by = (select auth.uid())
  or public.has_permission((select auth.uid()), 'ticket.delete')
);

-- ---------------------------------------------------------------------------
-- ticket_events
-- ---------------------------------------------------------------------------

create policy ticket_events_select on public.ticket_events
for select to authenticated
using (exists (select 1 from public.tickets t where t.id = ticket_id));

-- `actor_id` is pinned to the caller, and the event_type clause limits what they may claim: without
-- it a customer could write `assigned`/`status_changed` onto their own ticket and fabricate history
-- (the timeline renders from this table). `commented` is the only event a customer can produce.
-- A floor, not the design — ideally no client writes this table and triggers emit the events.
create policy ticket_events_insert on public.ticket_events
for insert to authenticated
with check (
  actor_id = (select auth.uid())
  and exists (select 1 from public.tickets t where t.id = ticket_id)
  and (
    public.has_permission((select auth.uid()), 'ticket.update')
    or event_type = 'commented'
  )
);

-- Append-only, enforced by the absence of update/delete policies.
