-- Lifecycle lives in-db because a customer holds no `ticket.update` yet must still reopen a ticket
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

-- If pg_cron is unavailable, drop this block and call the function from a scheduled Edge Function
create extension if not exists pg_cron;

select cron.schedule(
  'close-stale-solved-tickets',
  '0 2 * * *',
  'select public.close_stale_solved_tickets()'
);
