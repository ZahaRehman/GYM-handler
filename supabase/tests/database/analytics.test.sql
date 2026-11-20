-- Run with: supabase test db
-- Numbers must match a manual count of the fixture below.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- Isolate from seed data (rolled back at the end)
delete from public.reminders; delete from public.payments; delete from public.members;

insert into auth.users (id, email, aud, role)
values ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated');
insert into public.admins (user_id) values ('11111111-1111-1111-1111-111111111111');

insert into public.plans (id, name, duration_months, price) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'A-Monthly', 1, 3000),
  ('aaaaaaaa-0000-0000-0000-0000000000a3', 'A-Quarterly', 3, 8000);

-- "today" for the gym; due dates are relative to it so the test never goes stale
create temp table t as select (now() at time zone (select timezone from public.settings))::date as today;
grant select on t to authenticated;

insert into public.members (id, full_name, phone, plan_id, fee_amount, join_date, next_due_date, status)
select v.id::uuid, v.name, v.phone, v.plan::uuid, v.fee, t.today - v.joined, t.today + v.due, v.status::public.member_status
from t, (values
  ('dddddddd-0000-0000-0000-000000000001', 'Paid Up',     '+923002000001', 'aaaaaaaa-0000-0000-0000-0000000000a1', 3000, 100,  20, 'active'),
  ('dddddddd-0000-0000-0000-000000000002', 'Due Today',   '+923002000002', 'aaaaaaaa-0000-0000-0000-0000000000a1', 3000,  60,   0, 'active'),
  ('dddddddd-0000-0000-0000-000000000003', 'Late Month',  '+923002000003', 'aaaaaaaa-0000-0000-0000-0000000000a1', 2500,  90, -40, 'active'), -- 2 monthly cycles
  ('dddddddd-0000-0000-0000-000000000004', 'Late Quarter','+923002000004', 'aaaaaaaa-0000-0000-0000-0000000000a3', 8000, 200, -10, 'active'), -- 1 quarterly cycle
  ('dddddddd-0000-0000-0000-000000000005', 'Paused',      '+923002000005', 'aaaaaaaa-0000-0000-0000-0000000000a1', 3000, 300, -90, 'paused')
) as v(id, name, phone, plan, fee, joined, due, status);

-- payments: two this month, one last month
insert into public.payments (member_id, amount, type, method, paid_on, period_start, period_end, months)
select 'dddddddd-0000-0000-0000-000000000001'::uuid, 3000, 'membership'::public.payment_type, 'cash'::public.payment_method, date_trunc('month', t.today)::date,
       date_trunc('month', t.today)::date, date_trunc('month', t.today)::date + 30, 1::int from t
union all
select 'dddddddd-0000-0000-0000-000000000004', 1000, 'admission', 'easypaisa', date_trunc('month', t.today)::date, null::date, null::date, null::int from t
union all
select 'dddddddd-0000-0000-0000-000000000002', 3000, 'membership', 'bank', (date_trunc('month', t.today) - interval '1 month')::date,
       (date_trunc('month', t.today) - interval '1 month')::date - 5, null::date, 1 from t;

select is(public.missed_cycles('2026-10-10', '2026-11-19', 1), 2, 'missed_cycles: 2 monthly cycles');
select is(public.missed_cycles('2026-10-10', '2026-10-10', 1), 0, 'missed_cycles: not overdue on the due date');
select is(public.missed_cycles('2026-09-01', '2026-11-19', 3), 1, 'missed_cycles: 1 quarterly cycle');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

create temp table d as select public.dashboard_stats() as j;
select is((select (j->>'collected')::numeric from d), 4000::numeric, 'collected this month = 3000 + 1000');
select is((select (j->>'collected_prev')::numeric from d), 3000::numeric, 'collected last month');
select is((select (j->>'payments_count')::int from d), 2, 'payments this month');
select is((select (j->>'collected_prev_to_date')::numeric from d), 3000::numeric, 'last month up to the same day includes a 1st-of-month payment');
select is((select (j->>'is_current_month')::boolean from d), true, 'current month flagged');
select is((select (j->>'overdue_count')::int from d), 2, 'two active overdue members (paused excluded)');
select is((select (j->>'overdue_amount')::numeric from d), (2500 * 2 + 8000)::numeric, 'overdue amount counts missed cycles');
select is((select (j->>'due_today_count')::int from d), 1, 'one due today');
select is((select (j->>'active_members')::int from d), 4, 'four active members');

create temp table a as select public.analytics_summary(
  (date_trunc('month', (select today from t)) - interval '1 month')::date,
  (date_trunc('month', (select today from t)) + interval '1 month' - interval '1 day')::date) as j;
select is((select (j->>'total')::numeric from a), 7000::numeric, 'range total covers both months');
select is((select jsonb_array_length(j->'by_month') from a), 2, 'one row per month in range');
select is((select (j->'by_month'->1->>'membership')::numeric from a), 3000::numeric, 'membership split for this month');
select is((select (j->>'on_time')::int + (j->>'late')::int from a), 2, 'on-time/late counts only membership payments with a period');

select is((select count(*) from public.top_overdue(10)), 2::bigint, 'top_overdue lists overdue active members');
select is((select full_name from public.top_overdue(1)), 'Late Quarter', 'top_overdue sorted by amount due');

select * from finish();
rollback;
