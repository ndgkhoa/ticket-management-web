-- Row level security for every table.
--
-- Shape of the model:
--   customer  — own tickets only, public replies only, never internal notes
--   agent     — tickets assigned to them or to their team, internal notes included
--   admin/own — everything
-- Writes are gated on `has_permission()` rather than on a role name, so the
-- permission matrix stays editable data instead of hard-coded policy text.
--
-- Two conventions repeat below and both are deliberate:
--
--   `(select auth.uid())` rather than a bare `auth.uid()` — the scalar subquery is
--   hoisted into an InitPlan and evaluated once per statement. A bare call is
--   re-evaluated per row, which on a 500-row page is 500 calls.
--
--   `exists (select 1 from public.tickets t where t.id = <fk>)` as the visibility
--   test on child tables. That subquery is itself subject to the tickets policy
--   for this caller, so "can they see the parent ticket?" is answered once, in one
--   place, instead of being restated (and eventually mis-stated) on every child.

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

-- No policy is granted to `anon` anywhere in this file. RLS denies by default, so
-- an unauthenticated caller reads nothing — that is the intent, not an omission.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Visibility is earned per row, by a reason. There are four, and each exists
-- because a screen would break without it:
--
--   1. yourself
--   2. `user.read.all` — the user-admin screens genuinely list everyone (admin/owner)
--   3. anyone on a ticket you can see — the requester and assignee columns
--   4. staff, for agents — the assignee picker needs the roster
--
-- Branch 4 is scoped to team members rather than granted as `user.read.all`,
-- because "an agent needs the roster" does not justify handing an agent the entire
-- customer list. Customers are in no team, so this branch cannot expose them; the
-- only customers an agent reads are the ones on their own tickets, via branch 3.
--
-- Accepted trade-off: a customer sees the email of the agent on their ticket. It is
-- the address that emails them anyway. RLS is row-level, so hiding a single column
-- from a single role is not expressible here — that would need a view.
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or public.has_permission((select auth.uid()), 'user.read.all')
  -- Two separate EXISTS rather than one with an OR inside: an OR across two columns
  -- cannot use either index, so the planner falls back to scanning tickets once per
  -- candidate profile. Split, each branch is an index lookup on
  -- tickets_requester_created_idx / tickets_assignee_created_idx.
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

-- No insert policy: rows arrive through the `on_auth_user_created` trigger, which
-- is security definer. Nothing else has any business inventing a profile.

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

-- The role/permission catalog is readable by any signed-in user because the client
-- computes its own permission set from it to gate the UI. Knowing that a
-- permission named `ticket.assign` exists grants nothing; holding it is what
-- counts, and that is `user_roles`.
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

-- Own grants are readable so the app knows what it may offer; everyone else's
-- grants need the user-admin permission. This is the row that decides authority,
-- so it is the one table in the RBAC set that is not world-readable.
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

-- Names of teams, categories and tags are labels rendered on tickets; a customer
-- sees them the moment they see a ticket. Readable to all authenticated, writable
-- only by the matching admin permission.

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

-- Canned responses are agent-facing tooling. A customer has no reason to read the
-- internal reply library, and its wording is not written for them.
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

-- The policy the entire product hangs on. The predicate lives in
-- `can_access_ticket()` so that SELECT, UPDATE and DELETE cannot disagree about what
-- "visible" means — see that function for why sharing it is mandatory rather than
-- tidy.
create policy tickets_select on public.tickets
for select to authenticated
using (public.can_access_ticket((select auth.uid()), requester_id, assignee_id, team_id));

-- A customer may only file a ticket as themselves. Agents may file on behalf of a
-- requester, which is how phone and email tickets get in — hence the second
-- branch, gated on the same permission that lets them edit tickets at all.
create policy tickets_insert on public.tickets
for insert to authenticated
with check (
  public.has_permission((select auth.uid()), 'ticket.create')
  and (
    requester_id = (select auth.uid())
    or public.has_permission((select auth.uid()), 'ticket.update')
  )
);

-- Customers deliberately get no update path: status, priority and assignment are
-- agent decisions, and a customer's way to say something is a reply, not a field
-- edit. RLS cannot restrict individual columns, so a customer-update policy would
-- have to hand over the whole row.
--
-- `can_access_ticket` in USING is not belt-and-braces — it is the only thing scoping
-- this statement to rows the caller can see. A permission-only USING matches every
-- row in the table, because Postgres applies the SELECT policy to an UPDATE only when
-- the statement reads columns, and `update tickets set priority='urgent'` reads none.
-- An agent who can see 280 tickets would write all 500, then grant themselves the
-- rest with `set assignee_id = <self>`. Verified: without this clause, that exact
-- statement reports `UPDATE 500`.
create policy tickets_update on public.tickets
for update to authenticated
using (
  public.has_permission((select auth.uid()), 'ticket.update')
  and public.can_access_ticket((select auth.uid()), requester_id, assignee_id, team_id)
)
-- WITH CHECK is intentionally permission-only, not scoped: reassigning a ticket to
-- another team is legitimate work, and it necessarily produces a row the agent can no
-- longer see. Scoping the check would forbid the handoff — the one operation a triage
-- agent performs most.
with check (public.has_permission((select auth.uid()), 'ticket.update'));

-- Scoped for the same reason as UPDATE. Today only admin/owner hold `ticket.delete`
-- and they can see everything, so this changes nothing — until a role exists that can
-- delete its own team's tickets, at which point an unscoped USING would quietly mean
-- "delete the entire table".
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

-- The internal-note boundary. Ticket visibility is inherited from the tickets
-- policy; this adds the one rule that is specific to messages — an internal note
-- is invisible without the permission to read it, on a ticket you can otherwise
-- see in full.
create policy ticket_messages_select on public.ticket_messages
for select to authenticated
using (
  exists (select 1 from public.tickets t where t.id = ticket_id)
  and (
    type = 'public_reply'
    or public.has_permission((select auth.uid()), 'message.read.internal')
  )
);

-- You write as yourself: `author_id` is pinned to the caller so a reply cannot be
-- forged in someone else's name. Writing an internal note needs its own
-- permission — a customer replying on their own ticket must not be able to post
-- one by passing `type: 'internal_note'`.
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

-- No update or delete policy: the message timeline is the record of what was said.
-- Editing history in place is not a feature this product has, and RLS denying by
-- default is the cheapest way to keep it that way.

-- ---------------------------------------------------------------------------
-- attachments
-- ---------------------------------------------------------------------------

create policy attachments_select on public.attachments
for select to authenticated
using (
  exists (select 1 from public.tickets t where t.id = ticket_id)
  -- An attachment on an internal note inherits that note's invisibility. Without
  -- this the file name and URL leak the note's existence to the customer.
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

-- Deleting your own upload is the "wrong file, dragged twice" case. Anything
-- broader belongs to ticket administration.
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

-- `actor_id` is pinned to the caller, and what a caller may *claim happened* is
-- limited by what they can actually do. Without the event_type clause a customer can
-- write `assigned` or `status_changed` rows onto their own ticket: the timeline is
-- rendered from this table, so they could fabricate a history where an agent promised
-- a refund. `commented` is the only event a customer's own actions can produce.
--
-- This is a floor, not the finished design. The robust answer is that no client writes
-- this table at all and the events are emitted by triggers on the state changes
-- themselves — an audit trail whose subject holds the pen is a weak audit trail. That
-- belongs with the ticket workflow, which is where the state changes get written.
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

-- Append-only, enforced by the absence of update/delete policies. An audit trail
-- that its subject can rewrite is not an audit trail.
