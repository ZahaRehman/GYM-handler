# 03 — Database Schema (Supabase / Postgres)

## 1. Entity diagram

```
admins (user_id → auth.users)

settings (single row)

plans 1 ───< members 1 ───< payments
                     1 ───< reminders
```

| Table | Purpose |
|-------|---------|
| `admins` | Which auth users may use the panel |
| `settings` | Gym name, currency, timezone, reminder rules, message templates, WhatsApp provider |
| `plans` | Membership plans: Monthly, Quarterly, Yearly, Personal Training… |
| `members` | Member profile + current plan/fee + **`next_due_date`** |
| `payments` | Every fee received (the source of truth for revenue) |
| `reminders` | Every reminder generated/sent (audit + idempotency) |

**Future (expenses phase):** `expense_categories`, `expenses` — no changes needed to the tables above.

## 2. Business rules

1. A member's billing state is driven by **`next_due_date`**:
   - `next_due_date > today + upcoming_window` → **Paid**
   - `today < next_due_date ≤ today + upcoming_window` → **Due soon**
   - `next_due_date = today` → **Due today**
   - `next_due_date < today` → **Overdue** (missed cycles = how many plan periods have passed)
2. Paying **rolls the due date forward from the old due date**, not from the payment date (so late payers don't get free days). Owner can override the period if needed.
3. Money stored as **integer in the smallest unit?** For PKR/INR there are no practical paisa in gyms → store `numeric(12,2)` to stay simple and correct.
4. Members are never hard-deleted by default: status `left` (keeps revenue history). Hard delete available with confirmation.
5. Phone numbers stored in **E.164** (`+923001234567`) — required for WhatsApp.
6. All "today" calculations use the gym's timezone from `settings` (e.g. `Asia/Karachi`), not UTC.

## 3. SQL (first migration)

```sql
-- ===== Extensions =====
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ===== Enums =====
create type member_status   as enum ('active', 'paused', 'left');
create type gender_type     as enum ('male', 'female', 'other');
create type payment_method  as enum ('cash', 'bank', 'jazzcash', 'easypaisa', 'card', 'other');
create type payment_type    as enum ('membership', 'admission', 'personal_training', 'other');
create type reminder_kind   as enum ('before_due', 'on_due', 'overdue', 'receipt');
create type reminder_status as enum ('pending', 'sent', 'failed', 'skipped');

-- ===== Admins =====
create table admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ===== Settings (single row) =====
create table settings (
  id                     int primary key default 1 check (id = 1),
  gym_name               text not null default 'My Gym',
  gym_phone              text,
  currency               text not null default 'PKR',
  timezone               text not null default 'Asia/Karachi',
  upcoming_window_days   int  not null default 3,
  reminder_days_before   int[] not null default '{3,0}',   -- 3 days before + on due date
  overdue_repeat_days    int  not null default 3,          -- remind every 3 days while overdue
  overdue_max_reminders  int  not null default 3,
  whatsapp_provider      text not null default 'manual'    -- 'manual' | 'cloud_api' | 'unofficial'
                         check (whatsapp_provider in ('manual','cloud_api','unofficial')),
  template_before_due    text not null default
    'Assalam o Alaikum {name}! Your {gym} fee of {currency} {amount} is due on {due_date}. Thank you!',
  template_on_due        text not null default
    'Hi {name}, your {gym} fee of {currency} {amount} is due today ({due_date}).',
  template_overdue       text not null default
    'Hi {name}, your {gym} fee of {currency} {amount} was due on {due_date}. Please clear it at your earliest.',
  template_receipt       text not null default
    'Thank you {name}! Received {currency} {amount} on {paid_on}. Next due date: {due_date}. — {gym}',
  updated_at             timestamptz not null default now()
);
insert into settings (id) values (1);

-- ===== Plans =====
create table plans (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  duration_months  int  not null check (duration_months > 0),
  price            numeric(12,2) not null check (price >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ===== Members =====
create table members (
  id                      uuid primary key default gen_random_uuid(),
  member_code             int generated always as identity unique,  -- human friendly #1001
  full_name               text not null,
  phone                   text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  gender                  gender_type,
  date_of_birth           date,
  address                 text,
  cnic                    text,                      -- optional national ID
  emergency_contact_name  text,
  emergency_contact_phone text,
  photo_public_id         text,                      -- Cloudinary public_id
  plan_id                 uuid references plans(id) on delete set null,
  fee_amount              numeric(12,2) not null check (fee_amount >= 0), -- may differ from plan price (discount)
  join_date               date not null default current_date,
  next_due_date           date not null,
  status                  member_status not null default 'active',
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index members_due_idx    on members (status, next_due_date);
create index members_name_idx   on members using gin (to_tsvector('simple', full_name));
create index members_phone_idx  on members (phone);

-- ===== Payments =====
create table payments (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references members(id) on delete cascade,
  amount        numeric(12,2) not null check (amount > 0),
  type          payment_type not null default 'membership',
  method        payment_method not null default 'cash',
  paid_on       date not null default current_date,
  period_start  date,
  period_end    date,
  months        int  check (months > 0),
  note          text,
  received_by   uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index payments_member_idx on payments (member_id, paid_on desc);
create index payments_date_idx   on payments (paid_on);

-- ===== Reminders =====
create table reminders (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid not null references members(id) on delete cascade,
  due_date             date not null,
  kind                 reminder_kind not null,
  sequence             int  not null default 0,          -- 0..n for repeated overdue reminders
  channel              text not null default 'whatsapp',
  provider             text not null,
  status               reminder_status not null default 'pending',
  message              text not null,
  provider_message_id  text,
  error                text,
  created_at           timestamptz not null default now(),
  sent_at              timestamptz,
  unique (member_id, due_date, kind, sequence)            -- idempotency
);
create index reminders_status_idx on reminders (status, created_at);

-- ===== updated_at trigger =====
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger members_touch  before update on members  for each row execute function touch_updated_at();
create trigger settings_touch before update on settings for each row execute function touch_updated_at();

-- ===== RLS: admins only, everywhere =====
alter table admins    enable row level security;
alter table settings  enable row level security;
alter table plans     enable row level security;
alter table members   enable row level security;
alter table payments  enable row level security;
alter table reminders enable row level security;

create policy admin_all on settings  for all using (is_admin()) with check (is_admin());
create policy admin_all on plans     for all using (is_admin()) with check (is_admin());
create policy admin_all on members   for all using (is_admin()) with check (is_admin());
create policy admin_all on payments  for all using (is_admin()) with check (is_admin());
create policy admin_all on reminders for all using (is_admin()) with check (is_admin());
create policy self_read on admins    for select using (user_id = auth.uid());
```

## 4. Core RPC: `record_payment`

```sql
create or replace function record_payment(
  p_member_id uuid,
  p_amount    numeric,
  p_months    int default 1,
  p_method    payment_method default 'cash',
  p_paid_on   date default current_date,
  p_note      text default null
) returns payments
language plpgsql security invoker as $$
declare
  m       members;
  dur     int;
  p_start date;
  p_end   date;
  result  payments;
begin
  if not is_admin() then raise exception 'not authorized'; end if;

  select * into m from members where id = p_member_id for update;   -- lock row
  if not found then raise exception 'member not found'; end if;

  select coalesce(duration_months, 1) into dur from plans where id = m.plan_id;
  dur := coalesce(dur, 1);

  p_start := m.next_due_date;
  p_end   := (p_start + make_interval(months => dur * p_months))::date;

  insert into payments (member_id, amount, type, method, paid_on, period_start, period_end, months, note, received_by)
  values (p_member_id, p_amount, 'membership', p_method, p_paid_on, p_start, p_end, p_months, p_note, auth.uid())
  returning * into result;

  update members set next_due_date = p_end, status = 'active' where id = p_member_id;

  update reminders set status = 'skipped'
   where member_id = p_member_id and due_date = p_start and status = 'pending';

  return result;
end $$;
```

Also add `undo_payment(payment_id)` (delete payment + set `next_due_date = period_start`) — only allowed for the **latest** payment of that member, so mistakes can be fixed safely.

## 5. Analytics functions

```sql
-- Monthly revenue for last N months (fills empty months with 0)
create or replace function revenue_by_month(p_months int default 12)
returns table (month date, total numeric, payments_count bigint)
language sql stable as $$
  with months as (
    select generate_series(
      date_trunc('month', current_date) - make_interval(months => p_months - 1),
      date_trunc('month', current_date), interval '1 month')::date as month
  )
  select mo.month, coalesce(sum(p.amount), 0), count(p.id)
  from months mo
  left join payments p on date_trunc('month', p.paid_on) = mo.month
  group by mo.month order by mo.month;
$$;

-- Dashboard KPIs for a given month
create or replace function dashboard_stats(p_month date default date_trunc('month', current_date)::date)
returns json language sql stable as $$
  select json_build_object(
    'collected',        (select coalesce(sum(amount),0) from payments
                          where date_trunc('month', paid_on) = p_month),
    'outstanding_this_month', (select coalesce(sum(fee_amount),0) from members
                          where status = 'active'
                            and next_due_date < (p_month + interval '1 month')::date), -- still unpaid, due by month end
    'overdue_amount',   (select coalesce(sum(fee_amount *
                              greatest(1, ceil((current_date - next_due_date) / 30.0))),0)
                          from members where status = 'active' and next_due_date < current_date),
    'overdue_count',    (select count(*) from members where status='active' and next_due_date <  current_date),
    'due_today_count',  (select count(*) from members where status='active' and next_due_date =  current_date),
    'due_soon_count',   (select count(*) from members where status='active'
                          and next_due_date > current_date and next_due_date <= current_date + 3),
    'active_members',   (select count(*) from members where status='active'),
    'new_members',      (select count(*) from members where date_trunc('month', join_date) = p_month),
    'left_members',     (select count(*) from members where status='left'
                          and date_trunc('month', updated_at) = p_month)
  );
$$;

-- Revenue split by payment method / plan (for pie charts)
create or replace view v_revenue_by_method as
  select date_trunc('month', paid_on)::date as month, method, sum(amount) total
  from payments group by 1, 2;
```

> "Expected" revenue is the trickiest number. Simple, honest definition for v1:
> **Expected this month = collected this month + fees of active members currently overdue or due later this month.**
> Show it in the UI as `collected + outstanding_this_month` (both returned by `dashboard_stats`) and label it clearly. Refine later if the owner wants another definition.
> `overdue_amount` uses a 30-day approximation of missed cycles; fine for a dashboard, not for invoices.

Use `current_date` with the DB timezone set to the gym timezone:
`alter database postgres set timezone to 'Asia/Karachi';`

## 6. Seed data (dev only)
`supabase/seed.sql`: 3 plans (Monthly 3000, Quarterly 8000, Yearly 30000), ~30 fake members with spread-out due dates, ~6 months of payments → makes the dashboard meaningful during development.
