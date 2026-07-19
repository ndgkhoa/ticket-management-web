# Database Schema — single-tenant Help Desk (Supabase / Postgres)

RBAC is **global** (no organization scoping). All snake_case per Postgres convention; frontend maps to camelCase.

## Enums

```
ticket_status    : open · pending · on_hold · solved · closed
ticket_priority  : low · normal · high · urgent
ticket_channel   : web · email · chat
message_type     : public_reply · internal_note
ticket_event_type: created · assigned · status_changed · priority_changed · commented · tagged
```

## Tables (16)

### Identity & RBAC

```
profiles          id (PK, → auth.users.id) · email · full_name · avatar_url · created_at
roles             id (PK) · name (uniq) · description · is_system    seed: owner·admin·agent·customer
permissions       id (PK) · code (uniq, e.g. ticket.assign) · description
role_permissions  role_id (→roles) · permission_id (→permissions)         [PK pair]
user_roles        user_id (→profiles) · role_id (→roles)                  [PK pair]
```

### Organization & classification

```
teams          id (PK) · name · description                    e.g. Billing, Technical
team_members   team_id (→teams) · user_id (→profiles)          [PK pair]
categories     id (PK) · name · description
tags           id (PK) · name · color
```

### Ticket core

```
tickets         id (PK) · subject · description · status(ticket_status) · priority(ticket_priority)
                  · channel(ticket_channel) · requester_id(→profiles) · assignee_id(→profiles, null)
                  · team_id(→teams, null) · category_id(→categories, null) · sla_policy_id(→sla_policies, null)
                  · first_response_at · resolved_at · due_at · created_at · updated_at
                  · search_vector(tsvector, GENERATED — keyword search)
                  · embedding(vector(1536), pgvector — semantic search; see note below)
ticket_tags     ticket_id (→tickets) · tag_id (→tags)                     [PK pair]
ticket_messages id (PK) · ticket_id(→tickets) · author_id(→profiles) · type(message_type) · body · created_at
attachments     id (PK) · ticket_id(→tickets) · message_id(→ticket_messages, null)
                  · file_url · file_name · size_bytes · uploaded_by(→profiles) · created_at
```

### SLA & productivity

```
sla_policies      id (PK) · name · priority(ticket_priority) · first_response_mins · resolution_mins
canned_responses  id (PK) · title · body · created_by(→profiles)
ticket_events     id (PK) · ticket_id(→tickets) · actor_id(→profiles) · event_type(ticket_event_type)
                    · meta(jsonb) · created_at                 (audit / ticket timeline)
```

## Relationships

`tickets` is the hub: 1 requester + 0..1 assignee + 0..1 team/category/sla + N messages + N tags + N attachments + N events. RBAC via `user_roles` + `role_permissions`.

## Search & filter indexes

The ticket list filters + sorts + searches server-side (Phase 03 contract, Phase 06 UI). Without these it's a seq scan on every keystroke.

**Keyword search — generated tsvector + GIN.** Generated column (not a trigger): Postgres keeps it in sync, nothing to forget on write.

```sql
alter table tickets add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored;
create index tickets_search_vector_idx on tickets using gin (search_vector);
```

- Weighted `A`/`B` → subject matches outrank description matches when ranking.
- `'simple'` config, not `'english'`: content is mixed en/vi and the English stemmer mangles Vietnamese. Revisit only if search quality demands it (would require per-locale columns).
- Queried via `.textSearch('search_vector', q, { type: 'websearch' })` — `websearch` accepts human syntax (`"exact phrase"`, `-exclude`) and never throws on malformed input, unlike `plainto`/raw `tsquery`.

**Fuzzy fallback — pg_trgm.** FTS misses partial words + typos (`"payme"`, `"invioce"`), which is what people actually type in a help desk.

```sql
create extension if not exists pg_trgm;
create index tickets_subject_trgm_idx on tickets using gin (subject gin_trgm_ops);
```

Rule: `q` shorter than 3 chars or zero FTS hits → fall back to `subject ilike '%q%'`. Keep it in the shared list-query builder, not per screen.

**Semantic search — `vector(1536)`, not the provider default.** `gemini-embedding-001` returns **3072** dimensions by default, and **pgvector cannot index past 2000** (`hnsw` and `ivfflat` both cap there; the `vector` type allows 16000 but the index is the constraint). A 3072-dim column stores and queries fine on seed-sized data — it fails as an un-indexable sequential scan later, or errors outright at `create index`. Gemini embeddings are Matryoshka, so request `output_dimensionality: 1536` and truncation is lossless by design.

```sql
create extension if not exists vector;
alter table tickets add column embedding vector(1536);
create index tickets_embedding_idx on tickets using hnsw (embedding vector_cosine_ops);
```

Query and document embeddings must use the same model and dimension (`taskType: RETRIEVAL_QUERY` vs `RETRIEVAL_DOCUMENT` — mismatching those degrades ranking silently rather than erroring). `halfvec` indexes up to 4000 dims if 3072 is ever truly needed — out of scope.

**Filter + sort indexes.** List default is `created_at desc, id desc`, scoped by role.

```sql
create index tickets_status_created_idx   on tickets (status, created_at desc);
create index tickets_assignee_created_idx on tickets (assignee_id, created_at desc) where assignee_id is not null;
create index tickets_team_created_idx     on tickets (team_id, created_at desc)     where team_id is not null;
create index tickets_requester_created_idx on tickets (requester_id, created_at desc);  -- customer RLS path
create index tickets_priority_created_idx on tickets (priority, created_at desc);
create index ticket_tags_tag_idx          on ticket_tags (tag_id);                       -- tag filter join
create index ticket_messages_ticket_created_idx on ticket_messages (ticket_id, created_at);
create index ticket_events_ticket_created_idx   on ticket_events (ticket_id, created_at);
```

- Composite order is `(equality col, sort col desc)` — a B-tree can only use the sort if the equality columns come first.
- Partial (`where ... is not null`) keeps the unassigned-heavy columns small.
- `requester_id`/`assignee_id`/`team_id` indexes double as the RLS lookup path — RLS predicates run on every row of every query, so an unindexed policy column is a whole-table cost.

## RLS strategy (CV signal)

Every table RLS-enabled. Helper `has_permission(uid uuid, code text) returns boolean` (joins user_roles→role_permissions→permissions).

- **customer:** sees only tickets where `requester_id = auth.uid()`; only `public_reply` messages; cannot see internal notes.
- **agent:** sees tickets assigned to them or their team; sees `internal_note`; can comment/assign per permission.
- **admin/owner:** full access.
- Writes gated by `has_permission(auth.uid(), '<code>')`.

## Seed data

- Roles: owner, admin, agent, customer + permission matrix.
- Demo accounts (one per role) for live demo.
- Sample teams/categories/tags/SLA policies + ~30 seeded tickets with messages/events for a populated demo.

## MSW contract

MSW handlers return the same response shapes (camelCase-mapped) so unit/integration tests + the static demo run with zero network. Env flag `VITE_API_MODE=msw|supabase` switches the data source.
