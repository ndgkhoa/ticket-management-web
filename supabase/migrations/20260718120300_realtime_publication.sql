-- Enable Supabase Realtime for the ticket tables. `postgres_changes` only fires for tables in
-- the `supabase_realtime` publication (empty by default), so without this the live list pill and
-- the detail's live message updates never receive anything. RLS still governs which changes each
-- subscriber is allowed to see.

alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.ticket_messages;
alter publication supabase_realtime add table public.ticket_events;
