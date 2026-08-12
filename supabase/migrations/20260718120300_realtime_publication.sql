-- `postgres_changes` only fires for tables in this publication, which starts out empty
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.ticket_messages;
alter publication supabase_realtime add table public.ticket_events;
