-- LOCAL DEVELOPMENT SEED ONLY. Never run against production.
-- Test admin login: admin@gym.test / admin12345

do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
    'admin@gym.test', crypt('admin12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Gym Owner"}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user, v_user::text,
          jsonb_build_object('sub', v_user::text, 'email', 'admin@gym.test', 'email_verified', true),
          'email', now(), now(), now());

  insert into public.admins (user_id, full_name) values (v_user, 'Gym Owner');
end $$;

update public.settings set gym_name = 'Iron Paradise Gym', gym_phone = '+923001112233' where id = 1;

insert into public.plans (name, duration_months, price) values
  ('Monthly',   1,  3000),
  ('Quarterly', 3,  8000),
  ('Yearly',    12, 30000);

-- ~30 sample members with due dates spread around today (overdue, due today, due soon, paid).
insert into public.members (full_name, phone, gender, plan_id, fee_amount, join_date, next_due_date, status, address)
select
  n.name,
  '+92300' || lpad((1000000 + i * 7919 % 8999999)::text, 7, '0'),
  (case when i % 3 = 0 then 'female' else 'male' end)::public.gender_type,
  p.id,
  case when i % 7 = 0 then p.price - 500 else p.price end,
  current_date - (30 + i * 11),
  current_date + ((i * 5) % 40 - 12),
  (case when i = 27 then 'paused' when i = 29 then 'left' else 'active' end)::public.member_status,
  'Block ' || chr(65 + i % 8) || ', Lahore'
from (
  select (row_number() over ())::int as i, name from unnest(array[
    'Ali Raza','Ayesha Khan','Bilal Ahmed','Hamza Tariq','Sara Malik','Usman Javed','Zainab Ali','Fahad Iqbal',
    'Hira Shah','Imran Butt','Kashif Mehmood','Mariam Siddiqui','Noman Akhtar','Omer Farooq','Rabia Noor',
    'Saad Hussain','Talha Qureshi','Umair Aslam','Waqas Haider','Yasir Nawaz','Zara Sheikh','Adnan Saleem',
    'Danish Riaz','Ehsan Ullah','Faisal Karim','Ghazal Anwar','Haris Mirza','Junaid Abbas','Laiba Asif','Moiz Rehman'
  ]) as name
) n
join lateral (
  select id, price from public.plans
  order by case when n.i % 10 = 0 then duration_months end desc nulls last, duration_months
  limit 1
) p on true;

-- Payment history: one membership payment per past billing period since joining
-- (so the current next_due_date is consistent with the history), plus some admission fees.
insert into public.payments (member_id, amount, type, method, paid_on, period_start, period_end, months, received_by)
select m.id, m.fee_amount, 'membership',
       (array['cash','cash','cash','jazzcash','easypaisa','bank'])[1 + (abs(hashtext(m.id::text || k)) % 6)]::public.payment_method,
       least(current_date, (m.next_due_date - make_interval(months => p.duration_months * k))::date + (abs(hashtext(m.id::text || k)) % 5)),
       (m.next_due_date - make_interval(months => p.duration_months * k))::date,
       (m.next_due_date - make_interval(months => p.duration_months * (k - 1)))::date,
       1,
       '00000000-0000-0000-0000-000000000001'
from public.members m
join public.plans p on p.id = m.plan_id
cross join generate_series(1, 8) as k
where (m.next_due_date - make_interval(months => p.duration_months * k))::date >= m.join_date;

insert into public.payments (member_id, amount, type, method, paid_on, note, received_by)
select id, 1000, 'admission', 'cash', join_date, 'Admission fee', '00000000-0000-0000-0000-000000000001'
from public.members where member_code % 3 = 0;
