-- Own migration: a new enum label cannot be added and used in the same transaction
alter type public.ticket_event_type add value if not exists 'team_changed';
alter type public.ticket_event_type add value if not exists 'category_changed';
