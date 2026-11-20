-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Isolate from seed data
delete from public.reminders;
update public.members set status = 'left';
update public.settings set gym_name = 'Test Gym', currency = 'PKR', reminder_days_before = '{3,0}',
  overdue_repeat_days = 3, overdue_max_reminders = 2 where id = 1;

insert into auth.users (id, email, aud, role)
values ('11111111-1111-1111-1111-111111111111', 'owner@test.local', 'authenticated', 'authenticated'),
       ('22222222-2222-2222-2222-222222222222', 'stranger@test.local', 'authenticated', 'authenticated');
insert into public.admins (user_id) values ('11111111-1111-1111-1111-111111111111');

insert into public.members (id, full_name, phone, fee_amount, next_due_date, status) values
  ('cccccccc-0000-0000-0000-000000000001', 'Soon Sami',    '+923001000001', 3000, '2026-06-13', 'active'), -- 3 days before
  ('cccccccc-0000-0000-0000-000000000002', 'Today Tariq',  '+923001000002', 3500, '2026-06-10', 'active'), -- due today
  ('cccccccc-0000-0000-0000-000000000003', 'Late Laila',   '+923001000003', 3000, '2026-06-08', 'active'), -- 2 days overdue
  ('cccccccc-0000-0000-0000-000000000004', 'Later Lubna',  '+923001000004', 3000, '2026-06-20', 'active'), -- too far
  ('cccccccc-0000-0000-0000-000000000005', 'Paused Parveen','+923001000005', 3000, '2026-06-10', 'paused');

-- ---------- permissions ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select throws_ok($$ select public.generate_reminders('2026-06-10') $$, '42501', 'not authorized', 'non-admin cannot generate');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- ---------- day 1 ----------
select is((public.generate_reminders('2026-06-10') ->> 'created')::int, 3, 'creates before_due, on_due and overdue');
select is((select kind::text from public.reminders where member_id = 'cccccccc-0000-0000-0000-000000000001'), 'before_due', '3 days before -> before_due');
select is((select kind::text from public.reminders where member_id = 'cccccccc-0000-0000-0000-000000000002'), 'on_due', 'due today -> on_due');
select is((select kind::text from public.reminders where member_id = 'cccccccc-0000-0000-0000-000000000003'), 'overdue', 'past due -> overdue');
select is((select count(*) from public.reminders where member_id in ('cccccccc-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000005')), 0::bigint,
  'no reminder for far-away or paused members');
select is((select message from public.reminders where member_id = 'cccccccc-0000-0000-0000-000000000002'),
  'Hi Today, your Test Gym fee of Rs 3,500 is due today (10 Jun 2026).', 'message rendered from template');

-- idempotent
select is((public.generate_reminders('2026-06-10') ->> 'created')::int, 0, 'second run creates nothing');

-- ---------- overdue repeats ----------
-- simulate the first overdue reminder having been created on 10 Jun
update public.reminders set created_at = '2026-06-10 09:00+05' where kind = 'overdue';
-- 12 Jun: Tariq (due 10 Jun) becomes overdue -> his first overdue reminder; Laila must not repeat yet
select is((public.generate_reminders('2026-06-12') ->> 'created')::int, 1, 'only the newly overdue member gets a reminder');
select is((select count(*) from public.reminders where member_id = 'cccccccc-0000-0000-0000-000000000003' and kind = 'overdue'),
  1::bigint, 'no repeat before overdue_repeat_days');
select ok((public.generate_reminders('2026-06-13') ->> 'created')::int >= 1, 'repeat after 3 days');
select is((select max(sequence) from public.reminders where member_id = 'cccccccc-0000-0000-0000-000000000003' and kind = 'overdue'), 2,
  'second overdue reminder has sequence 2');
select is((select count(*) from public.reminders where member_id = 'cccccccc-0000-0000-0000-000000000003' and status = 'pending'), 1::bigint,
  'only the newest reminder stays pending per member');

-- max reached: no third overdue reminder even much later
update public.reminders set created_at = '2026-06-13 09:00+05' where kind = 'overdue' and sequence = 2;
select public.generate_reminders('2026-06-30');
select is((select count(*) from public.reminders where member_id = 'cccccccc-0000-0000-0000-000000000003' and kind = 'overdue'), 2::bigint,
  'stops at overdue_max_reminders');

select * from finish();
rollback;
