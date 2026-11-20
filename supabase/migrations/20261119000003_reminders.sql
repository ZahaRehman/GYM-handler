-- Reminders: daily generation of WhatsApp fee reminders (docs/04-whatsapp-reminders.md).
--
-- Phase 3 uses the free "manual" provider: generated reminders wait as 'pending'
-- in the app's queue and the owner sends each one with a wa.me link.
-- pg_cron calls generate_reminders() directly, so no edge function or secret is needed.
-- A sending provider (Meta Cloud API) can later be added as an edge function that
-- picks up pending rows.

create extension if not exists pg_cron;

-- Render a template for one member. Placeholders: {name} {gym} {currency} {amount} {due_date} {member_code}
create or replace function public.render_member_message(p_template text, m public.members, s public.settings)
returns text
language sql stable set search_path = public as $$
  select replace(replace(replace(replace(replace(replace(p_template,
    '{name}',        split_part(trim(m.full_name), ' ', 1)),
    '{gym}',         s.gym_name),
    '{currency}',    case when s.currency = 'PKR' then 'Rs' else s.currency end),
    '{amount}',      to_char(m.fee_amount, 'FM999,999,999')),
    '{due_date}',    to_char(m.next_due_date, 'FMDD Mon YYYY')),
    '{member_code}', m.member_code::text);
$$;

-- Create today's reminders. Idempotent: running it twice creates nothing new.
--   before_due : due date is N days away, N in settings.reminder_days_before (N > 0). sequence = N.
--   on_due     : due today and 0 is in reminder_days_before.
--   overdue    : past due, no overdue reminder for this due date in the last
--                overdue_repeat_days days, and fewer than overdue_max_reminders so far.
--                (Self-healing: if the job misses a day, the next run catches up.)
-- Older pending reminders for the same member are marked skipped so the queue
-- only ever shows one message per member.
create or replace function public.generate_reminders(p_today date default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s        public.settings;
  v_today  date;
  v_new    int := 0;
  v_cleared int := 0;
  n        int;
begin
  -- Allowed: admins (Run now button) and jobs without a JWT (pg_cron). Not anon / other users.
  if coalesce(auth.role(), '') <> '' and not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into s from public.settings where id = 1;
  v_today := coalesce(p_today, (now() at time zone s.timezone)::date);

  -- 1. before_due (N days before) and on_due (N = 0)
  insert into public.reminders (member_id, due_date, kind, sequence, provider, message)
  select m.id, m.next_due_date,
         case when d = 0 then 'on_due'::public.reminder_kind else 'before_due'::public.reminder_kind end,
         d, s.whatsapp_provider,
         public.render_member_message(case when d = 0 then s.template_on_due else s.template_before_due end, m, s)
  from public.members m
  cross join unnest(s.reminder_days_before) as d
  where m.status = 'active'
    and d >= 0
    and m.next_due_date - v_today = d
  on conflict (member_id, due_date, kind, sequence) do nothing;
  get diagnostics n = row_count;
  v_new := v_new + n;

  -- 2. overdue, repeating every overdue_repeat_days up to overdue_max_reminders
  insert into public.reminders (member_id, due_date, kind, sequence, provider, message)
  select m.id, m.next_due_date, 'overdue', coalesce(prev.cnt, 0) + 1, s.whatsapp_provider,
         public.render_member_message(s.template_overdue, m, s)
  from public.members m
  left join lateral (
    select count(*) as cnt, max(r.created_at) as last_at
    from public.reminders r
    where r.member_id = m.id and r.due_date = m.next_due_date and r.kind = 'overdue'
  ) prev on true
  where m.status = 'active'
    and m.next_due_date < v_today
    and s.overdue_max_reminders > 0
    and coalesce(prev.cnt, 0) < s.overdue_max_reminders
    and (prev.last_at is null
         or (prev.last_at at time zone s.timezone)::date <= v_today - s.overdue_repeat_days)
  on conflict (member_id, due_date, kind, sequence) do nothing;
  get diagnostics n = row_count;
  v_new := v_new + n;

  -- 3. tidy the queue: keep only the newest pending reminder per member,
  --    and drop pending ones for members who are no longer active.
  update public.reminders r
     set status = 'skipped'
   where r.status = 'pending'
     and (
       exists (select 1 from public.members m where m.id = r.member_id and m.status <> 'active')
       or exists (select 1 from public.reminders newer
                   where newer.member_id = r.member_id and newer.status = 'pending'
                     and newer.created_at > r.created_at)
     );
  get diagnostics v_cleared = row_count;

  return jsonb_build_object('date', v_today, 'created', v_new, 'cleared', v_cleared,
    'pending', (select count(*) from public.reminders where status = 'pending'));
end $$;

revoke execute on function public.generate_reminders(date) from public, anon;
grant execute on function public.generate_reminders(date) to authenticated;

-- Daily at 04:00 UTC = 09:00 Asia/Karachi. Change the hour if the gym is in another timezone.
select cron.schedule('daily-fee-reminders', '0 4 * * *', $$select public.generate_reminders()$$);
