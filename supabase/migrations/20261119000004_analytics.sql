-- Analytics for the dashboard and Analytics page (docs/03-database-schema.md §5).
-- All functions are SECURITY INVOKER: RLS applies, and an explicit admin check gives a clear error.

-- How many billing cycles a member is behind (0 if not overdue).
-- Due 10 Oct on a monthly plan, today 19 Nov -> cycles 10 Oct and 10 Nov unpaid -> 2.
create or replace function public.missed_cycles(p_due date, p_today date, p_duration_months int)
returns int
language sql immutable as $$
  select case when p_due >= p_today then 0
    else (
      (extract(year from age(p_today, p_due))::int * 12 + extract(month from age(p_today, p_due))::int)
      / greatest(p_duration_months, 1)
    ) + 1
  end;
$$;

-- KPIs for one month (p_month = any date in that month).
create or replace function public.dashboard_stats(p_month date default null)
returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  s        public.settings;
  v_today  date;
  v_start  date;
  v_end    date;   -- exclusive
  v_prev   date;
  result   jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into s from public.settings where id = 1;
  v_today := (now() at time zone s.timezone)::date;
  v_start := date_trunc('month', coalesce(p_month, v_today))::date;
  v_end   := (v_start + interval '1 month')::date;
  v_prev  := (v_start - interval '1 month')::date;

  with active as (
    select m.*, coalesce(p.duration_months, 1) as dur
    from public.members m left join public.plans p on p.id = m.plan_id
    where m.status = 'active'
  )
  select jsonb_build_object(
    'month',            v_start,
    'today',            v_today,
    'collected',        (select coalesce(sum(amount), 0) from public.payments where paid_on >= v_start and paid_on < v_end),
    'payments_count',   (select count(*) from public.payments where paid_on >= v_start and paid_on < v_end),
    'collected_prev',   (select coalesce(sum(amount), 0) from public.payments where paid_on >= v_prev and paid_on < v_start),
    -- for the current month: last month up to the same day, so a half-finished month isn't compared to a full one
    'collected_prev_to_date', (select coalesce(sum(amount), 0) from public.payments
                                where paid_on >= v_prev
                                  and paid_on < least(v_start, v_prev + (v_today - v_start) + 1)),
    'is_current_month', (v_today >= v_start and v_today < v_end),
    -- still unpaid with a due date up to the end of this month (includes overdue)
    'pending_amount',   (select coalesce(sum(fee_amount), 0) from active where next_due_date < v_end),
    'pending_count',    (select count(*) from active where next_due_date < v_end),
    'overdue_amount',   (select coalesce(sum(fee_amount * public.missed_cycles(next_due_date, v_today, dur)), 0)
                           from active where next_due_date < v_today),
    'overdue_count',    (select count(*) from active where next_due_date < v_today),
    'due_today_count',  (select count(*) from active where next_due_date = v_today),
    'due_week_count',   (select count(*) from active where next_due_date >= v_today and next_due_date <= v_today + 7),
    'active_members',   (select count(*) from active),
    'paused_members',   (select count(*) from public.members where status = 'paused'),
    'new_members',      (select count(*) from public.members where join_date >= v_start and join_date < v_end),
    'new_members_prev', (select count(*) from public.members where join_date >= v_prev and join_date < v_start)
  ) into result;

  return result;
end $$;

-- Everything the Analytics page needs for a date range, in one round trip.
create or replace function public.analytics_summary(p_from date, p_to date)
returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_from > p_to then
    raise exception 'from must be on or before to' using errcode = '22023';
  end if;

  with
  months as (
    select generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month')::date as month
  ),
  pay as (
    select * from public.payments where paid_on between p_from and p_to
  ),
  by_month as (
    select mo.month,
           coalesce(sum(p.amount), 0)                                          as total,
           coalesce(sum(p.amount) filter (where p.type = 'membership'), 0)     as membership,
           coalesce(sum(p.amount) filter (where p.type <> 'membership'), 0)    as other,
           count(p.id)                                                         as payments,
           (select count(*) from public.members m
             where m.join_date >= mo.month and m.join_date < (mo.month + interval '1 month')::date
               and m.join_date between p_from and p_to)                        as new_members
    from months mo
    left join pay p on date_trunc('month', p.paid_on)::date = mo.month
    group by mo.month
  )
  select jsonb_build_object(
    'from', p_from,
    'to',   p_to,
    'total',    (select coalesce(sum(amount), 0) from pay),
    'payments', (select count(*) from pay),
    'members_paid', (select count(distinct member_id) from pay),
    'by_month', (select coalesce(jsonb_agg(jsonb_build_object(
                    'month', month, 'total', total, 'membership', membership, 'other', other,
                    'payments', payments, 'new_members', new_members) order by month), '[]') from by_month),
    'by_method', (select coalesce(jsonb_agg(jsonb_build_object('method', method, 'total', total, 'payments', n) order by total desc), '[]')
                  from (select method, sum(amount) total, count(*) n from pay group by method) x),
    'by_type',   (select coalesce(jsonb_agg(jsonb_build_object('type', type, 'total', total, 'payments', n) order by total desc), '[]')
                  from (select type, sum(amount) total, count(*) n from pay group by type) x),
    -- membership revenue by the member's current plan
    'by_plan',   (select coalesce(jsonb_agg(jsonb_build_object('plan', plan, 'total', total, 'payments', n) order by total desc), '[]')
                  from (select coalesce(pl.name, 'No plan') plan, sum(p.amount) total, count(*) n
                        from pay p join public.members m on m.id = p.member_id
                        left join public.plans pl on pl.id = m.plan_id
                        where p.type = 'membership' group by 1) x),
    -- paid on or before the start of the period it covers
    'on_time',   (select count(*) from pay where type = 'membership' and period_start is not null and paid_on <= period_start),
    'late',      (select count(*) from pay where type = 'membership' and period_start is not null and paid_on > period_start)
  ) into result;

  return result;
end $$;

-- Members owing the most right now.
create or replace function public.top_overdue(p_limit int default 10)
returns table (id uuid, full_name text, member_code int, phone text, photo_public_id text,
               next_due_date date, days_overdue int, cycles int, amount_due numeric)
language sql stable security invoker set search_path = public as $$
  with t as (select (now() at time zone timezone)::date as today from public.settings where id = 1)
  select m.id, m.full_name, m.member_code, m.phone, m.photo_public_id, m.next_due_date,
         (t.today - m.next_due_date)::int,
         public.missed_cycles(m.next_due_date, t.today, coalesce(p.duration_months, 1)),
         m.fee_amount * public.missed_cycles(m.next_due_date, t.today, coalesce(p.duration_months, 1))
  from public.members m
  cross join t
  left join public.plans p on p.id = m.plan_id
  where m.status = 'active' and m.next_due_date < t.today
  order by 9 desc, m.next_due_date
  limit greatest(1, least(p_limit, 100));
$$;

revoke execute on function public.dashboard_stats(date) from anon;
revoke execute on function public.analytics_summary(date, date) from anon;
revoke execute on function public.top_overdue(int) from anon;
