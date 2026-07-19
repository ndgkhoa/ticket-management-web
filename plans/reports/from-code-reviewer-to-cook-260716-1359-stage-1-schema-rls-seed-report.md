# Stage 1 review — schema + RLS + seed

Scope: 7 migrations, 8 fixture modules, 2 scripts, package.json. Uncommitted, branch `develop`.
Method: every finding below marked CONFIRMED was executed against the running local stack
(`supabase_db_ticket-management-web`) inside a transaction with `set local role` + `set local
request.jwt.claims`, and rolled back. SUSPECTED = reasoned only.

Verdict: the read-side RLS model is sound — I could not break customer isolation, internal notes,
author forgery, requester impersonation, or privilege escalation. The write side has one critical
hole. Grants have a class of bug identical to the one already shipped once, in the opposite
direction: privileges arriving that were never granted.

---

## CRITICAL

### C1 — `tickets_update` has no row scope: an agent can hijack every ticket in the desk

`supabase/migrations/20260716120500_row_level_security.sql:230-233`

```sql
create policy tickets_update on public.tickets
for update to authenticated
using (public.has_permission((select auth.uid()), 'ticket.update'))
with check (public.has_permission((select auth.uid()), 'ticket.update'));
```

The predicate is a pure permission check with **no reference to `assignee_id`, `team_id` or
`requester_id`**. It relies entirely on the `tickets_select` policy to scope the rows — and Postgres
only applies SELECT policies to an UPDATE when the statement _references table columns_ (i.e. has a
WHERE clause). An UPDATE with no filter references nothing, so `tickets_select` never runs and
`tickets_update` matches every row in the table.

CONFIRMED. Agent `...0003` can see 280 of 500 tickets:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000001-0000-4000-8000-000000000003","role":"authenticated"}';
  select count(*) from public.tickets;          -- 280   (RLS working on read)
  update public.tickets set priority = 'urgent';-- UPDATE 500  <-- 220 invisible rows written
rollback;
```

Full takeover — the agent seizes every ticket, then legitimately reads all of them:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000001-0000-4000-8000-000000000003","role":"authenticated"}';
  update public.tickets set assignee_id='00000001-0000-4000-8000-000000000003', status='closed';
  -- UPDATE 500
  select count(*) from public.tickets;  -- 500   (was 280 — read isolation destroyed by a write)
rollback;
```

Contrast, same agent, same intent, _with_ a filter — proving the mechanism:

```sql
  select count(*) from public.tickets where id='00000009-0000-4000-8000-000000000002';  -- 0 (invisible)
  update public.tickets set priority='urgent' where id='00000009-0000-4000-8000-000000000002'; -- UPDATE 0
```

**Reachability is not theoretical.** `supabase.from('tickets').update({...})` with a forgotten
`.eq()` emits `PATCH /rest/v1/tickets` with no query string, which PostgREST renders as an
unfiltered `UPDATE`. PostgREST does not block unfiltered updates. A malicious agent needs one curl
with their own JWT; an honest developer needs one missing filter in Stage 3.

`Prefer: return=representation` does **not** save you — I tested `returning`, still 500 rows.

What holds up, and why it matters for the fix:

- Customers are safe (`UPDATE 0`) — decision 3 (no customer update policy) is load-bearing, keep it.
- `delete from public.tickets` as agent → `DELETE 0`, agents lack `ticket.delete`. But note the same
  shape exists in `tickets_delete` (`:235-237`): permission-only, no row scope. An admin has
  `ticket.read.all` so it is not an escalation _today_; it becomes one the moment any role gets
  `ticket.delete` without `ticket.read.all`.

Fix — mirror the select policy's row scope into the update policy:

```sql
using (
  public.has_permission((select auth.uid()), 'ticket.update')
  and (
    public.has_permission((select auth.uid()), 'ticket.read.all')
    or assignee_id = (select auth.uid())
    or (team_id is not null and public.is_team_member((select auth.uid()), team_id))
  )
)
```

Apply the same to `with check` (else an agent updates a visible ticket _into_ invisibility, or onto
another team) and to `tickets_delete`. **Do not** rely on SELECT-policy composition — this test is
exactly why.

---

## HIGH

### H1 — `anon` and `authenticated` hold TRUNCATE on every table; the grants file states the opposite

`supabase/migrations/20260716120600_grants.sql:13-15` claims "`anon` is granted nothing at all" and
`:40-48` claims withholding UPDATE/DELETE means "editing history needs two separate mistakes".

Both claims are false. CONFIRMED:

```sql
select grantee, table_name, string_agg(privilege_type,',' order by privilege_type)
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated') group by 1,2;
-- anon | tickets | REFERENCES,TRIGGER,TRUNCATE     (every table)
```

Mechanism (`pg_default_acl`): migrations run as `postgres`, and `postgres` has a default ACL on
schema `public` of `anon=Dxtm/postgres, authenticated=Dxtm/postgres, service_role=Dxtm/postgres`.
`D`=TRUNCATE, `x`=REFERENCES, `t`=TRIGGER. **Every table these migrations create automatically hands
anon TRUNCATE.** The explicit-grants philosophy in the file header is correct in spirit but only
controls the DML subset; it never revokes what arrives by default.

RLS does not filter TRUNCATE. Executed as `anon` (rolled back):

```sql
begin;
  set local role anon;
  truncate table public.ticket_messages cascade;  -- TRUNCATE TABLE  <-- succeeded
rollback;
```

And as `authenticated`, against the "append-only" audit trail:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000001-0000-4000-8000-000000000004","role":"authenticated"}';
  select count(*) from public.ticket_events;  -- 32
  truncate table public.ticket_events;        -- TRUNCATE TABLE  <-- succeeded
rollback;
```

Exploitability, honestly: PostgREST never emits TRUNCATE, so there is no _current_ HTTP path. This
is a latent landmine + a false comment, not a live breach — hence High, not Critical. It becomes
live the day anyone adds a `security invoker` RPC in `public`, or connects with the anon/authenticated
role directly. The append-only guarantee in `grants.sql:40-48` and `ticket_core.sql:76-77` is
currently one `truncate` away from nothing.

Fix, in the grants migration:

```sql
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
-- then the explicit grants already in this file
```

### H2 — a new signup gets zero roles and cannot open a ticket

`supabase/migrations/20260716120100_identity_and_rbac.sql:84-109`

`handle_new_user()` creates the profile but never assigns a role. The `customer` role exists only
because `seed.sql` inserts `user_roles` by hand. Every real registration — email or OAuth — lands a
user with no roles, therefore no permissions, therefore no `ticket.create`.

CONFIRMED:

```sql
begin;
  insert into auth.users (...) values ('000000ff-0000-4000-8000-0000000000ff', 'newbie@demo.local', ...);
  select count(*) from public.profiles   where id='000000ff-...';  -- 1  (profile created)
  select count(*) from public.user_roles where user_id='000000ff-...';  -- 0  (no role)
  select public.has_permission('000000ff-...','ticket.create');    -- f  <-- cannot open a ticket
rollback;
```

The sign-up flow is dead on arrival: register → land in the app → the one action the product exists
for is denied by RLS. The seed masks this completely, so no demo will surface it; it appears the
first time a real user registers.

Fix: assign the default `customer` role in `handle_new_user()` (same definer, same `search_path=''`),
looked up by `roles.name = 'customer'`.

---

## MEDIUM

### M1 — customers can forge audit-trail events on their own ticket

`row_level_security.sql:331-336`. `ticket_events_insert` pins `actor_id` to the caller and checks
ticket visibility, but leaves `event_type` and `meta` entirely unconstrained.

CONFIRMED — customer injects a fabricated `status_changed`:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000001-0000-4000-8000-000000000004","role":"authenticated"}';
  insert into public.ticket_events (ticket_id, actor_id, event_type, meta)
  select id,'00000001-0000-4000-8000-000000000004','status_changed','{"from":"open","to":"solved","forged":true}'
  from public.tickets where requester_id='00000001-0000-4000-8000-000000000004' limit 1;
  -- INSERT 0 1
rollback;
```

`actor_id` pinning limits it to events attributed to themselves, so this is timeline pollution and
dispute-time spoofing ("the system says it was solved"), not impersonation. Append-only protects the
trail from _edits_ while leaving it open to _fabrication_ — an audit trail whose subject can write
arbitrary entries is weaker than it reads. Events are a system-of-record concern: they should be
written by triggers or a `security definer` RPC, not client inserts. If client inserts stay for
Stage 1, gate non-`commented` event types on `ticket.update`.

### M2 — `profiles.email` is caller-writable with no unique constraint → display-identity spoofing

`row_level_security.sql:85-88` + `identity_and_rbac.sql:9`. CONFIRMED:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000001-0000-4000-8000-000000000004","role":"authenticated"}';
  update public.profiles set email='attacker@evil.com' where id='...0004';  -- UPDATE 1
rollback;
```

`profiles_update` is correctly self-scoped, but RLS cannot restrict _columns_, so "edit your own
profile" includes `email`. `auth.users.email` is unaffected → the two silently desync, and
`profiles.email` is the one the app renders. With no unique constraint, a customer can set their
email to `admin@demo.local` and impersonate on every screen that shows a requester. Same root cause
as the acknowledged agent-email trade-off, but this one is a write, not a read.

Fix: `email` should not be client-writable. Either drop it from profiles and read `auth.users.email`
via a definer view, or add a BEFORE UPDATE trigger pinning `new.email = old.email` for non-`user.manage`
callers. Add `unique (email)` regardless.

### M3 — `anon` can call `has_permission()` — an RBAC oracle on the public API

`grants.sql:52-53` grants EXECUTE to `authenticated`, but Postgres also grants EXECUTE to `PUBLIC` by
default, and the migration never revokes it. `pg_proc.proacl` = `{=X/postgres,postgres=X/postgres,authenticated=X/postgres}`
— the leading `=X` is PUBLIC.

CONFIRMED at the DB level:

```sql
begin;
  set local role anon;
  select public.has_permission('00000001-0000-4000-8000-000000000001','permission.manage');  -- t
rollback;
```

SUSPECTED (not executed over HTTP): `public` is the PostgREST-exposed schema and `has_permission(uuid,text)`
is a callable signature, so `POST /rest/v1/rpc/has_permission` with only the anon key should return
this. Worth one curl to confirm before acting. Impact is bounded — the attacker needs a valid uid —
but it lets an unauthenticated caller identify which accounts hold `permission.manage` / `user.manage`,
i.e. build a target list. Fix: `revoke execute on function public.has_permission(uuid,text), public.is_team_member(uuid,uuid) from public;`

### M4 — no index can serve the default ticket list

`ticket_core.sql:105-115`. Every composite index leads with an equality column
(`status`/`priority`/`assignee_id`/`team_id`/`requester_id`). The list's default state — no filter,
`order by created_at desc, id desc` — has no leading equality column, so nothing serves it.

CONFIRMED structurally (not small-table bias — forced):

```sql
set enable_seqscan=off;
explain (costs off) select id from public.tickets order by created_at desc, id desc limit 25;
--  Limit -> Sort (Sort Key: created_at DESC, id DESC) -> Seq Scan on tickets
```

Even with seq scans disabled the planner cannot find an index — confirming absence, not preference.
At 500 rows this is a 30kB top-N heapsort and invisible; it degrades linearly and the default list is
the most-executed query in the product. The spec (`database-schema.md:91-98`) omits it too, so this
is a spec gap, not a drift from it.

Fix: `create index tickets_created_idx on public.tickets (created_at desc, id desc);`

Note also that no composite index carries the `id` tiebreak, so filtered sorts add an Incremental
Sort step (`Presorted Key: created_at`). Correct, just not free — appending `id desc` to the five
composites removes it. Low priority; `count: 'estimated'` + offset pagination make this minor.

### M5 — `profiles_select` runs a correlated subquery per profile row for non-admins

CONFIRMED. As admin the OR short-circuits and the ticket subquery is skipped entirely
(`SubPlan 8 ... never executed`) — the ordering rationale in the comment at `:44-52` holds and is
worth keeping. As a customer it does not:

```
Seq Scan on profiles (actual rows=7)
  SubPlan 8 -> Bitmap Heap Scan on tickets t (actual rows=0, loops=51)
                 Heap Blocks: exact=594
```

51 loops = one bitmap scan over `tickets` per profile in the table. Scales as O(profiles) subqueries
for any caller lacking `user.read.all` — i.e. every customer and every agent. Bounded in practice by
whether the client ever issues an unfiltered `select` on profiles (PostgREST embeds like
`requester:profiles!requester_id(*)` filter by id first and are fine). Flagging so Stage 3 avoids a
profile-directory screen for agents without measuring first.

---

## LOW

### L1 — `sql(undefined)` crashes with an opaque TypeError; `as SqlValue` defeats the type check

`scripts/generate-seed-sql.ts:42-49,68`. Discovered accidentally while injecting drift: renaming a
team broke `TEAM_BY_TOPIC` → `teamIdByName.get(...)!` returned `undefined` → `sql(undefined)` →

```
TypeError: undefined is not an object (evaluating 'value.replace')
    at sql (scripts/generate-seed-sql.ts:48:14)
```

Two compounding issues: `SqlValue` excludes `undefined`, but `row[column] as SqlValue` (`:68`) casts
the check away, so TS cannot catch it; and the non-null assertions at `tickets.ts:105-106`
(`categoryRows.find(...)!`, `teamIdByName.get(...)!`) assert a coupling that nothing enforces. The
failure mode is loud here (crash), which is the good case — but the same pattern on a nullable column
would emit `null` and silently seed wrong data. Add `if (value === undefined) throw new Error(...)`
naming the column, and drop the cast.

### L2 — `check-seed-sync.ts` does not restore on generator failure, and dumps a raw stack

`scripts/check-seed-sync.ts:29,33-44`. The restore only runs inside the `committed !== regenerated`
branch. If `execFileSync` throws (L1), the exception escapes and the restore never runs — harmless
today only because the generator's `writeFileSync` is its last statement, so nothing was written. The
output is ~40 lines of Bun stack trace instead of the intended message. Wrap in try/finally.

Otherwise the guard genuinely works. CONFIRMED with a benign fixture edit (team description):

```
supabase/seed.sql is out of sync with src/mocks/fixtures.
Run `bun run seed:gen` and commit the result.
exit=1
```

…and the tree was left clean (`seed.sql` byte-identical to the committed version afterwards).

### L3 — attachments have zero seed rows; insert path is visibility-blind (read path holds)

`select count(*) from public.attachments` → **0**. The table, its RLS, and the internal-note
inheritance rule at `row_level_security.sql:301-304` are exercised by no data at all, and Stage 4
parity tests will have no attachment fixtures.

Related, and minor because the read side holds: `attachments_insert` (`:307-312`) validates
`ticket_id` visibility but not `message_id` visibility, so a customer can plant an attachment on an
internal note they cannot see. CONFIRMED — insert succeeded, read-back correctly denied:

```sql
insert into public.attachments (ticket_id, message_id, ...) values ('<tid>','0000000a-0000-4000-8000-0000000000b3',...);
-- INSERT 0 1
select count(*) from public.attachments where message_id='0000000a-...';  -- 0  (read boundary holds)
```

Consequence is a customer file appearing on an agent's private note, not a leak. Add the same
`exists (select 1 from public.ticket_messages m where m.id = message_id)` to the insert check.

### L4 — two files over the ~200 LOC standard

`scripts/generate-seed-sql.ts` 294, `src/mocks/fixtures/tickets.ts` 251, vs `code-standards.md` ~200.
Both are cohesive and I would not split them for the count alone; noting for the record. The other
13 files comply.

---

## Verified as correct — do not re-litigate

Executed, all correctly denied or correctly scoped:

| Test                                            | Result                                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Customer reads another customer's ticket        | 14 visible, `where requester_id <> self` → **0**                                             |
| Customer `count(*)` leaks totals                | **14**, not 500 — aggregates are RLS-filtered, no disclosure                                 |
| Customer reads internal notes                   | **0** of 1020 messages; 32 visible, all `public_reply`                                       |
| Customer reads `canned_responses`               | **0**                                                                                        |
| Customer enumerates profiles                    | **7** — self + 5 agents + demo agent; verified all 5 are role=`agent`, zero customers leaked |
| Customer forges `author_id` on message          | `new row violates row-level security policy`                                                 |
| Customer posts `internal_note`                  | `new row violates row-level security policy`                                                 |
| Customer inserts ticket as another requester    | `new row violates row-level security policy`                                                 |
| Customer self-escalates via `user_roles` insert | `new row violates row-level security policy`                                                 |
| Customer mass-update (C1 trick)                 | **UPDATE 0** — decision 3 is load-bearing                                                    |
| Agent unfiltered DELETE                         | **DELETE 0**                                                                                 |

Grant/policy pairing: I enumerated all 16 tables. **No grant-without-policy and no
policy-without-grant** in the DML subset — the class of bug from last time is fixed. `profiles` has
no INSERT grant and no insert policy; `ticket_messages`/`ticket_events` have no UPDATE/DELETE grant
and no such policy. Consistent. (H1 is a different class: privileges never granted by this file.)

Definer safety: `has_permission`, `is_team_member`, `handle_new_user` are all `security definer` with
`proconfig = {"search_path=\"\""}` and fully-qualified bodies — verified via `pg_proc`. No recursion:
`profiles_select` → `tickets` → `has_permission`/`is_team_member` (definer, bypasses RLS) → terminates.
`set_updated_at` is correctly invoker.

Seed determinism: **byte-identical across runs and matching the committed file** —
`08f2ae04ad6ae05a51c1ec687e6b66f1944e7ac61156e49b42d1ff7e758474f2` twice. `faker.seed(2002)` + fixed
`NOW` + `gen_salt` deferred to the database (so the bcrypt hash never enters the file) all do exactly
what the comments claim.

SQL injection via fixture strings: `sql()` doubles single quotes; 57 escaped apostrophes in the
output; zero backslashes (`standard_conforming_strings=on` makes that safe anyway); jsonb goes through
`JSON.stringify` then the same escape. The 922KB seed applies cleanly — 500 tickets, 1020 messages,
32 events present. FK insert ordering is correct, and the TRUNCATE→`delete from auth.users` ordering
comment at `:89-97` is accurate.

Index coverage vs spec: all 8 indexes from `database-schema.md:91-98` are implemented as specified.
The `requester_id` RLS path is index-served (`Bitmap Index Scan on tickets_requester_created_idx`),
and the status+priority combo does a sensible `BitmapAnd`. M4 is the one real gap and the spec shares it.

Lint: 0 errors, 5 pre-existing warnings in unrelated `src/features/admin` files. No `typecheck`
script — `build` runs `tsc -b`.

---

## Recommended actions

1. **C1** — add row scope to `tickets_update` USING **and** WITH CHECK; same for `tickets_delete`. Blocking.
2. **H1** — revoke default privileges from `anon`/`authenticated`; correct the two false comments in `grants.sql`. Blocking.
3. **H2** — assign the `customer` role in `handle_new_user()`. Blocking — sign-up is broken without it.
4. **M2** — stop `profiles.email` being client-writable; add `unique (email)`.
5. **M1** — move `ticket_events` writes behind a trigger/definer, or gate `event_type` on `ticket.update`.
6. **M3** — revoke EXECUTE on the two helpers from PUBLIC (confirm the HTTP hop first).
7. **M4** — add `tickets (created_at desc, id desc)`.
8. **L1/L2** — throw a named error on `undefined` in `sql()`; wrap the regenerate in try/finally.
9. **L3** — add attachment fixtures before Stage 4 parity work; add the message-visibility check to `attachments_insert`.

C1 and H2 are the two that will bite in Stage 3 specifically: the first rewards a forgotten `.eq()`
with a 500-row write, the second makes every non-seeded account inert.

## Unresolved questions

1. M3's HTTP hop — is `has_permission` actually reachable at `/rest/v1/rpc/has_permission` with the
   anon key? One curl decides whether it is Medium or noise. I confirmed only the DB half.
2. `ticket_events` — are client-side inserts the intended long-term write path, or a Stage 1
   placeholder until triggers land? M1's fix differs materially.
3. C1's WITH CHECK: should an agent be able to move a ticket to a team they are not in (i.e. hand it
   off and lose visibility)? That is a product decision and it changes the predicate.
4. Decision 5 says messages/events are append-only "no grant AND no policy" — H1 shows TRUNCATE
   defeats both. Does that change the appetite for a DB-level guard, or is revoking the default
   privilege sufficient?
