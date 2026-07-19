-- Two audit event types the workflow could already produce but the trail could not name:
-- routing a ticket to a team and (re)categorising it. Team/category changes previously
-- updated the row silently, leaving no activity entry — the gap this closes.
--
-- Enum values are added in their own migration: a new label cannot be added and then used in
-- the same transaction, and the trigger that emits them (next migration) uses them.
alter type public.ticket_event_type add value if not exists 'team_changed';
alter type public.ticket_event_type add value if not exists 'category_changed';
