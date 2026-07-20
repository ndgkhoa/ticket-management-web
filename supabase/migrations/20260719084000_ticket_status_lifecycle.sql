-- Ticket status lifecycle: auto-reopen on customer reply, auto-close stale solved tickets. Both
-- live in the database so every path is covered and a customer (holds no ticket.update) can still reopen.

-- AFTER INSERT on ticket_messages: a public reply from the requester reopens a solved ticket and
-- clears resolved_at, restarting the resolution clock. SECURITY DEFINER (the customer can't update
-- tickets). Only when solved, so it never touches an open or `closed` (terminal) ticket; an agent
-- reply has author_id ≠ requester_id, so it never reopens.
create or replace function public.reopen_on_customer_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type = 'public_reply' then
    update public.tickets
    set status = 'open', resolved_at = null
    where id = new.ticket_id
      and status = 'solved'
      and requester_id = new.author_id;
  end if;
  return new;
end;
$$;

create trigger ticket_messages_reopen_on_customer_reply
after insert on public.ticket_messages
for each row
execute function public.reopen_on_customer_reply();

-- Sweep solved tickets resolved more than N days ago (default 7) into closed. Idempotent (a re-run
-- touches only newly-aged rows) and independent of any end user — runs from the scheduler as definer
-- with a system/null audit actor.
create or replace function public.close_stale_solved_tickets(p_days integer default 7)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.tickets
  set status = 'closed'
  where status = 'solved'
    and resolved_at is not null
    and resolved_at < now() - make_interval(days => p_days);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Schedule the daily sweep via pg_cron. If pg_cron is unavailable, remove this block and call
-- close_stale_solved_tickets() from a scheduled Edge Function — the SQL function holds the logic either way.
create extension if not exists pg_cron;

select cron.schedule(
  'close-stale-solved-tickets',
  '0 2 * * *',
  'select public.close_stale_solved_tickets()'
);
