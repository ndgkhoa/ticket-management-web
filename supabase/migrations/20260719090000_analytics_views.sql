-- Every function is security invoker and reads `tickets` directly, so RLS scopes each aggregation
-- to the caller with no separate role logic
create or replace function public.dashboard_kpis(p_from timestamptz)
returns table (
  open_count bigint,
  avg_first_response_mins numeric,
  avg_resolution_mins numeric,
  sla_compliance_pct numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    -- Not window-scoped: "open tickets" is a right-now number, whatever the filter range
    (select count(*) from public.tickets where status in ('open', 'pending', 'on_hold')),
    round(avg(extract(epoch from (t.first_response_at - t.created_at)) / 60)
      filter (where t.first_response_at is not null))::numeric,
    round(avg(extract(epoch from (t.resolved_at - t.created_at)) / 60)
      filter (where t.resolved_at is not null))::numeric,
    -- A resolved ticket with no `due_at` leaves the denominator rather than counting as a breach
    round(
      100.0 * count(*) filter (where t.resolved_at is not null and t.resolved_at <= t.due_at)
        / nullif(count(*) filter (where t.resolved_at is not null and t.due_at is not null), 0),
      1
    )
  from public.tickets t
  where t.created_at >= p_from;
$$;

create or replace function public.dashboard_volume(p_from timestamptz)
returns table (day date, created_count bigint, resolved_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with days as (
    select generate_series(p_from::date, now()::date, interval '1 day')::date as day
  ),
  created as (
    select t.created_at::date as day, count(*) as c
    from public.tickets t where t.created_at >= p_from group by 1
  ),
  resolved as (
    select t.resolved_at::date as day, count(*) as c
    from public.tickets t where t.resolved_at >= p_from group by 1
  )
  select d.day, coalesce(cr.c, 0), coalesce(rs.c, 0)
  from days d
  left join created cr on cr.day = d.day
  left join resolved rs on rs.day = d.day
  order by d.day;
$$;

create or replace function public.dashboard_status_distribution(p_from timestamptz)
returns table (status text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.status::text, count(*)
  from public.tickets t where t.created_at >= p_from
  group by t.status order by t.status;
$$;

create or replace function public.dashboard_priority_distribution(p_from timestamptz)
returns table (priority text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.priority::text, count(*)
  from public.tickets t where t.created_at >= p_from
  group by t.priority order by t.priority;
$$;

create or replace function public.dashboard_category_distribution(p_from timestamptz)
returns table (category text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(c.name, 'Uncategorized'), count(*)
  from public.tickets t
  left join public.categories c on c.id = t.category_id
  where t.created_at >= p_from
  group by coalesce(c.name, 'Uncategorized')
  order by count(*) desc, coalesce(c.name, 'Uncategorized');
$$;

create or replace function public.dashboard_agent_performance(p_from timestamptz)
returns table (
  agent text,
  assigned_count bigint,
  resolved_count bigint,
  avg_resolution_mins numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.full_name,
    count(*),
    count(*) filter (where t.resolved_at is not null),
    round(avg(extract(epoch from (t.resolved_at - t.created_at)) / 60)
      filter (where t.resolved_at is not null))::numeric
  from public.tickets t
  join public.profiles p on p.id = t.assignee_id
  where t.created_at >= p_from and t.assignee_id is not null
  group by p.full_name
  order by count(*) filter (where t.resolved_at is not null) desc;
$$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'dashboard_kpis', 'dashboard_volume', 'dashboard_status_distribution',
    'dashboard_priority_distribution', 'dashboard_category_distribution',
    'dashboard_agent_performance'
  ] loop
    execute format('revoke all on function public.%I(timestamptz) from public;', fn);
    execute format('grant execute on function public.%I(timestamptz) to authenticated;', fn);
  end loop;
end;
$$;
