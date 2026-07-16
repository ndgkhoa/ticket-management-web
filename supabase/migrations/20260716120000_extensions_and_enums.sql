-- Extensions and the domain enums every later table depends on.
--
-- Extensions live in the `extensions` schema, not `public`: Supabase keeps user
-- tables in `public`, and an extension there would end up in the generated types
-- and in every `select *`. The `extensions` schema is on the default search_path
-- for Supabase roles, but this file qualifies extension types explicitly anyway —
-- a migration that relies on the caller's search_path breaks the day it runs under
-- a role with a different one.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists vector with schema extensions;
-- `crypt()`/`gen_salt()`, used by the seed to hash demo passwords in the database
-- rather than committing bcrypt hashes to the repo.
create extension if not exists pgcrypto with schema extensions;

-- Ticket lifecycle. `pending` = waiting on the requester, `on_hold` = waiting on
-- something internal; both are "not actionable right now" but they mean opposite
-- things to an SLA timer, which is why they are distinct values rather than one.
create type public.ticket_status as enum ('open', 'pending', 'on_hold', 'solved', 'closed');

create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');

create type public.ticket_channel as enum ('web', 'email', 'chat');

-- The distinction the whole customer-facing RLS story rests on: a customer must
-- never see `internal_note`.
create type public.message_type as enum ('public_reply', 'internal_note');

create type public.ticket_event_type as enum (
  'created',
  'assigned',
  'status_changed',
  'priority_changed',
  'commented',
  'tagged'
);
