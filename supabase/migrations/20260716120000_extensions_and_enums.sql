-- Extensions and the domain enums every later table depends on.
-- Extensions live in `extensions` schema (not `public`) to keep them out of generated types and
-- `select *`; extension types are qualified explicitly so nothing relies on the caller's search_path.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists vector with schema extensions;
-- `crypt()`/`gen_salt()`: lets the seed hash demo passwords in-db instead of committing hashes.
create extension if not exists pgcrypto with schema extensions;

-- Ticket lifecycle. `pending` = waiting on requester, `on_hold` = waiting on something internal;
-- distinct values because they mean opposite things to the SLA timer.
create type public.ticket_status as enum ('open', 'pending', 'on_hold', 'solved', 'closed');

create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');

create type public.ticket_channel as enum ('web', 'email', 'chat');

-- The customer-facing RLS boundary: a customer must never see `internal_note`.
create type public.message_type as enum ('public_reply', 'internal_note');

create type public.ticket_event_type as enum (
  'created',
  'assigned',
  'status_changed',
  'priority_changed',
  'commented',
  'tagged'
);
