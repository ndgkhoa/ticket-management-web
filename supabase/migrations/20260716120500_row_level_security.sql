-- Row level security for every table; writes gate on `has_permission()`, never on a role name.
-- No `anon` policy anywhere: RLS denies by default, so an unauthenticated caller reads nothing
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

-- `(select auth.uid())` hoists into an InitPlan: evaluated once per statement, not once per row
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or public.has_permission((select auth.uid()), 'user.read.all')
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

-- No insert policy: rows arrive only through the `on_auth_user_created` trigger
create policy profiles_update on public.profiles
for update to authenticated
using (id = (select auth.uid()) or public.has_permission((select auth.uid()), 'user.manage'))
with check (id = (select auth.uid()) or public.has_permission((select auth.uid()), 'user.manage'));

create policy profiles_delete on public.profiles
for delete to authenticated
using (public.has_permission((select auth.uid()), 'user.manage'));

-- The catalog is world-readable: knowing a permission exists grants nothing, holding it does
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

-- `user_roles` decides authority, so unlike the rest of the catalog it is not world-readable
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

-- Labels a customer already sees on their own ticket, so reads are open and writes are not
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

create policy canned_responses_select on public.canned_responses
for select to authenticated
using (public.has_permission((select auth.uid()), 'canned.read'));

create policy canned_responses_write on public.canned_responses
for all to authenticated
using (public.has_permission((select auth.uid()), 'canned.manage'))
with check (public.has_permission((select auth.uid()), 'canned.manage'));

create policy tickets_select on public.tickets
for select to authenticated
using (public.can_access_ticket((select auth.uid()), requester_id, assignee_id, team_id));

create policy tickets_insert on public.tickets
for insert to authenticated
with check (
  public.has_permission((select auth.uid()), 'ticket.create')
  and (
    requester_id = (select auth.uid())
    or public.has_permission((select auth.uid()), 'ticket.update')
  )
);

-- `can_access_ticket` in USING is what scopes the UPDATE; permission alone would match every row
create policy tickets_update on public.tickets
for update to authenticated
using (
  public.has_permission((select auth.uid()), 'ticket.update')
  and public.can_access_ticket((select auth.uid()), requester_id, assignee_id, team_id)
)
-- Deliberately unscoped: scoping the check would forbid handing a ticket to another team
with check (public.has_permission((select auth.uid()), 'ticket.update'));

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

-- Ticket visibility is inherited; this adds the rule that an internal note needs its own permission
create policy ticket_messages_select on public.ticket_messages
for select to authenticated
using (
  exists (select 1 from public.tickets t where t.id = ticket_id)
  and (
    type = 'public_reply'
    or public.has_permission((select auth.uid()), 'message.read.internal')
  )
);

-- `author_id` is pinned to the caller so a reply cannot be forged in someone else's name
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

-- Messages have no update/delete policy: the timeline is the record of what was said

-- An attachment on an internal note inherits its invisibility, else its name leaks the note
create policy attachments_select on public.attachments
for select to authenticated
using (
  exists (select 1 from public.tickets t where t.id = ticket_id)
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

create policy attachments_delete on public.attachments
for delete to authenticated
using (
  uploaded_by = (select auth.uid())
  or public.has_permission((select auth.uid()), 'ticket.delete')
);

create policy ticket_events_select on public.ticket_events
for select to authenticated
using (exists (select 1 from public.tickets t where t.id = ticket_id));

-- `actor_id` is pinned and `event_type` limited, so a customer cannot fabricate ticket history
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

