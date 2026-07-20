-- Enable Supabase Realtime for the ticket tables. `postgres_changes` only fires for tables in the
-- `supabase_realtime` publication (empty by default). RLS still governs which changes each subscriber sees.

alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.ticket_messages;
alter publication supabase_realtime add table public.ticket_events;
