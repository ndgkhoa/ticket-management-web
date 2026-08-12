create extension if not exists pg_trgm with schema extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- `pending` waits on the requester, `on_hold` on us; both pause the SLA clock
create type public.ticket_status as enum ('open', 'pending', 'on_hold', 'solved', 'closed');

create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');

create type public.ticket_channel as enum ('web', 'email', 'chat');

-- `internal_note` is the customer-facing RLS boundary: a requester must never see one
create type public.message_type as enum ('public_reply', 'internal_note');

create type public.ticket_event_type as enum (
  'created',
  'assigned',
  'status_changed',
  'priority_changed',
  'commented',
  'tagged'
);
