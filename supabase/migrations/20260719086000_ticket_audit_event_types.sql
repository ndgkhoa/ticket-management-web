-- Two audit event types: routing to a team and (re)categorising, which previously updated the row
-- silently with no activity entry. In their own migration because a new enum label can't be added
-- and used in the same transaction, and the emitting trigger (next migration) uses them.
alter type public.ticket_event_type add value if not exists 'team_changed';
alter type public.ticket_event_type add value if not exists 'category_changed';
