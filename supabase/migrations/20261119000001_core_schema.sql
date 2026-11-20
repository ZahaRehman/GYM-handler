-- Core schema: admins, settings, plans, members, payments, reminders + RLS.
-- See docs/03-database-schema.md

-- All "today" logic uses the gym's local timezone.
alter database postgres set timezone to 'Asia/Karachi';

-- ===== Enums =====
create type public.member_status   as enum ('active', 'paused', 'left');
create type public.gender_type     as enum ('male', 'female', 'other');
create type public.payment_method  as enum ('cash', 'bank', 'jazzcash', 'easypaisa', 'card', 'other');
create type public.payment_type    as enum ('membership', 'admission', 'personal_training', 'other');
create type public.reminder_kind   as enum ('before_due', 'on_due', 'overdue', 'receipt');
create type public.reminder_status as enum ('pending', 'sent', 'failed', 'skipped');

-- ===== Admins =====
create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ===== Settings (single row) =====
create table public.settings (
  id                     int primary key default 1 check (id = 1),
  gym_name               text not null default 'My Gym',
  gym_phone              text,
  currency               text not null default 'PKR',
  timezone               text not null default 'Asia/Karachi',
  upcoming_window_days   int  not null default 3 check (upcoming_window_days >= 0),
  reminder_days_before   int[] not null default '{3,0}',
  overdue_repeat_days    int  not null default 3 check (overdue_repeat_days > 0),
  overdue_max_reminders  int  not null default 3 check (overdue_max_reminders >= 0),
  whatsapp_provider      text not null default 'manual'
                         check (whatsapp_provider in ('manual', 'cloud_api', 'unofficial')),
  template_before_due    text not null default
    'Assalam o Alaikum {name}! Your {gym} fee of {currency} {amount} is due on {due_date}. Thank you!',
  template_on_due        text not null default
    'Hi {name}, your {gym} fee of {currency} {amount} is due today ({due_date}).',
  template_overdue       text not null default
    'Hi {name}, your {gym} fee of {currency} {amount} was due on {due_date}. Please clear it at your earliest.',
  template_receipt       text not null default
    'Thank you {name}! Received {currency} {amount} on {paid_on}. Next due date: {due_date}. - {gym}',
  updated_at             timestamptz not null default now()
);
insert into public.settings (id) values (1);

-- ===== Plans =====
create table public.plans (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  duration_months  int  not null check (duration_months > 0),
  price            numeric(12,2) not null check (price >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ===== Members =====
create table public.members (
  id                      uuid primary key default gen_random_uuid(),
  member_code             int generated always as identity (start with 1001) unique,
  full_name               text not null check (length(trim(full_name)) > 0),
  phone                   text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  gender                  public.gender_type,
  date_of_birth           date,
  address                 text,
  cnic                    text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  photo_public_id         text,
  plan_id                 uuid references public.plans(id) on delete set null,
  fee_amount              numeric(12,2) not null check (fee_amount >= 0),
  join_date               date not null default current_date,
  next_due_date           date not null,
  status                  public.member_status not null default 'active',
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index members_due_idx   on public.members (status, next_due_date);
create index members_name_idx  on public.members using gin (to_tsvector('simple', full_name));
create index members_phone_idx on public.members (phone);
create index members_plan_idx  on public.members (plan_id);

-- ===== Payments =====
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members(id) on delete cascade,
  amount        numeric(12,2) not null check (amount > 0),
  type          public.payment_type not null default 'membership',
  method        public.payment_method not null default 'cash',
  paid_on       date not null default current_date,
  period_start  date,
  period_end    date,
  months        int check (months > 0),
  note          text,
  received_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index payments_member_idx on public.payments (member_id, paid_on desc);
create index payments_date_idx   on public.payments (paid_on);

-- ===== Reminders =====
create table public.reminders (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid not null references public.members(id) on delete cascade,
  due_date             date not null,
  kind                 public.reminder_kind not null,
  sequence             int  not null default 0,
  channel              text not null default 'whatsapp',
  provider             text not null,
  status               public.reminder_status not null default 'pending',
  message              text not null,
  provider_message_id  text,
  error                text,
  created_at           timestamptz not null default now(),
  sent_at              timestamptz,
  unique (member_id, due_date, kind, sequence)
);
create index reminders_status_idx on public.reminders (status, created_at);

-- ===== updated_at trigger =====
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger members_touch  before update on public.members
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ===== RLS: admins only =====
alter table public.admins    enable row level security;
alter table public.settings  enable row level security;
alter table public.plans     enable row level security;
alter table public.members   enable row level security;
alter table public.payments  enable row level security;
alter table public.reminders enable row level security;

create policy admin_all on public.settings  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.plans     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.members   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.payments  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.reminders for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy self_read on public.admins    for select to authenticated using (user_id = auth.uid());

-- Settings is a single row: never deleted or re-inserted from the client.
revoke insert, delete on public.settings from anon, authenticated;
