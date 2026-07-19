-- Ticket status lifecycle: auto-reopen on customer reply, auto-close stale solved tickets.
--
-- Status was any→any with no rules: a customer reply on a solved ticket didn't reopen it, and
-- solved tickets never aged into closed (audit gap #4). Real desks reopen on customer activity
-- and sweep stale solved tickets closed. Both live in the database so every path is covered and
-- a customer (who holds no ticket.update) can still trigger a reopen.

-- AFTER INSERT on ticket_messages: a public reply from the ticket's own requester (the customer)
-- reopens a solved ticket and clears resolved_at, restarting the resolution clock. SECURITY
-- DEFINER because the customer cannot update tickets themselves. Scoped to the one ticket and
-- only when solved, so it never thrashes an already-open ticket and never touches `closed`
-- (terminal). An agent reply has author_id ≠ requester_id, so it never reopens.
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

-- Sweep solved tickets whose resolution is older than N days into closed. Idempotent — a
-- re-run touches only newly-aged rows — and independent of any end user (runs from the
-- scheduler as definer; the audit actor for these is system/null, Phase 05). N defaults to 7.
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

-- Schedule the daily sweep via pg_cron. If the target project cannot enable pg_cron, remove
-- this block and call close_stale_solved_tickets() from a scheduled Edge Function instead —
-- the SQL function is the single source of the logic either way.
create extension if not exists pg_cron;

select cron.schedule(
  'close-stale-solved-tickets',
  '0 2 * * *',
  'select public.close_stale_solved_tickets()'
);
