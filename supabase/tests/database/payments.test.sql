-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- ---------- fixtures ----------
insert into auth.users (id, email, aud, role)
values ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated'),
       ('22222222-2222-2222-2222-222222222222', 'stranger@test.local', 'authenticated', 'authenticated');
insert into public.admins (user_id, full_name) values ('11111111-1111-1111-1111-111111111111', 'Owner');

insert into public.plans (id, name, duration_months, price) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'T-Monthly', 1, 3000),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'T-Quarterly', 3, 8000);

insert into public.members (id, full_name, phone, plan_id, fee_amount, join_date, next_due_date) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Monthly Guy', '+923001111111', 'aaaaaaaa-0000-0000-0000-000000000001', 3000, '2026-01-31', '2026-01-31'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Quarter Gal', '+923002222222', 'aaaaaaaa-0000-0000-0000-000000000003', 8000, '2026-03-10', '2026-06-10'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Paused Pat',  '+923003333333', 'aaaaaaaa-0000-0000-0000-000000000001', 3000, '2026-01-01', '2026-05-05');
update public.members set status = 'paused' where id = 'bbbbbbbb-0000-0000-0000-000000000003';

-- ---------- act as a non-admin ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select throws_ok(
  $$ select public.record_payment('bbbbbbbb-0000-0000-0000-000000000001', 3000) $$,
  '42501', 'not authorized', 'non-admin cannot record payments');
select is((select count(*) from public.members), 0::bigint, 'non-admin sees no members (RLS)');

-- ---------- act as the admin ----------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- month-end clamp: 31 Jan + 1 month = 28 Feb
select is((public.record_payment('bbbbbbbb-0000-0000-0000-000000000001', 3000, 1, 'cash', '2026-02-02')).period_end,
  '2026-02-28'::date, '31 Jan + 1 month clamps to 28 Feb');
select is((select next_due_date from public.members where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  '2026-02-28'::date, 'member due date moved to period end');

-- late payment: period starts at the OLD due date, not the payment date
select is((public.record_payment('bbbbbbbb-0000-0000-0000-000000000001', 3000, 1, 'cash', '2026-03-15')).period_start,
  '2026-02-28'::date, 'late payment starts from old due date');

-- multi-month on a quarterly plan: 2 × 3 months
select is((public.record_payment('bbbbbbbb-0000-0000-0000-000000000002', 16000, 2, 'bank')).period_end,
  '2026-12-10'::date, '2 quarters move due date 6 months');

-- non-membership payment does not move the due date
select lives_ok(
  $$ select public.record_payment('bbbbbbbb-0000-0000-0000-000000000002', 1000, 1, 'cash', current_date, 'Admission', 'admission') $$,
  'admission fee is recorded');
select is((select next_due_date from public.members where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  '2026-12-10'::date, 'admission fee leaves due date alone');
select is((select period_end from public.payments
            where type = 'admission' and member_id = 'bbbbbbbb-0000-0000-0000-000000000002'), null, 'admission has no period');

-- paying re-activates a paused member
select lives_ok($$ select public.record_payment('bbbbbbbb-0000-0000-0000-000000000003', 3000) $$, 'paused member can pay');
select is((select status::text from public.members where id = 'bbbbbbbb-0000-0000-0000-000000000003'), 'active', 'payment re-activates paused member');

-- validation
select throws_ok($$ select public.record_payment('bbbbbbbb-0000-0000-0000-000000000001', 0) $$,
  '22023', 'amount must be greater than zero', 'zero amount rejected');
select throws_ok($$ select public.record_payment('bbbbbbbb-0000-0000-0000-000000000001', 3000, 0) $$,
  '22023', 'months must be between 1 and 36', 'zero months rejected');

-- undo: only the latest membership payment, and it restores the due date
select throws_ok(
  format('select public.undo_payment(%L)', (select id from public.payments
          where member_id = 'bbbbbbbb-0000-0000-0000-000000000001' order by period_end asc limit 1)),
  '22023', 'only the latest membership payment can be undone', 'cannot undo an older payment');
select lives_ok(
  format('select public.undo_payment(%L)', (select id from public.payments
          where member_id = 'bbbbbbbb-0000-0000-0000-000000000001' order by period_end desc limit 1)),
  'can undo the latest payment');
select is((select next_due_date from public.members where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  '2026-02-28'::date, 'undo restores previous due date');

-- undo refused if the due date was edited by hand afterwards
update public.members set next_due_date = '2026-09-09' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
select throws_ok(
  format('select public.undo_payment(%L)', (select id from public.payments
          where member_id = 'bbbbbbbb-0000-0000-0000-000000000002' and type = 'membership')),
  '22023', 'the due date was changed after this payment; edit the member instead', 'undo refused after manual due date edit');

select * from finish();
rollback;
