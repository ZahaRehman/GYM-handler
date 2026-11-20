-- Payments: record_payment() and undo_payment().
-- Business rules: docs/03-database-schema.md §2 and §4.

-- Record a payment. For type 'membership' it moves the member's due date forward
-- from the OLD due date (late payers don't get free days) by plan length × months.
-- Other types (admission, personal training, other) are just recorded.
create or replace function public.record_payment(
  p_member_id uuid,
  p_amount    numeric,
  p_months    int default 1,
  p_method    public.payment_method default 'cash',
  p_paid_on   date default current_date,
  p_note      text default null,
  p_type      public.payment_type default 'membership'
) returns public.payments
language plpgsql security invoker set search_path = public as $$
declare
  m       public.members;
  dur     int;
  p_start date;
  p_end   date;
  result  public.payments;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be greater than zero' using errcode = '22023';
  end if;

  select * into m from public.members where id = p_member_id for update;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  if p_type <> 'membership' then
    insert into public.payments (member_id, amount, type, method, paid_on, note, received_by)
    values (p_member_id, p_amount, p_type, p_method, p_paid_on, p_note, auth.uid())
    returning * into result;
    return result;
  end if;

  if p_months is null or p_months < 1 or p_months > 36 then
    raise exception 'months must be between 1 and 36' using errcode = '22023';
  end if;

  select duration_months into dur from public.plans where id = m.plan_id;
  dur := coalesce(dur, 1);

  p_start := m.next_due_date;
  p_end   := (p_start + make_interval(months => dur * p_months))::date;

  insert into public.payments (member_id, amount, type, method, paid_on, period_start, period_end, months, note, received_by)
  values (p_member_id, p_amount, 'membership', p_method, p_paid_on, p_start, p_end, p_months, p_note, auth.uid())
  returning * into result;

  -- Paying re-activates a paused member; a member who left stays 'left' until re-activated by hand.
  update public.members
     set next_due_date = p_end,
         status = case when status = 'paused' then 'active'::public.member_status else status end
   where id = p_member_id;

  update public.reminders
     set status = 'skipped'
   where member_id = p_member_id and due_date = p_start and status = 'pending';

  return result;
end $$;

-- Undo a payment recorded by mistake.
-- Membership payments can only be undone if they are the member's latest one
-- and the due date hasn't been changed since (so dates can be restored safely).
create or replace function public.undo_payment(p_payment_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
declare
  p      public.payments;
  m      public.members;
  latest uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into p from public.payments where id = p_payment_id;
  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;

  if p.type = 'membership' then
    select * into m from public.members where id = p.member_id for update;

    select id into latest from public.payments
     where member_id = p.member_id and type = 'membership'
     order by period_end desc nulls last, created_at desc
     limit 1;

    if latest <> p.id then
      raise exception 'only the latest membership payment can be undone' using errcode = '22023';
    end if;
    if m.next_due_date <> p.period_end then
      raise exception 'the due date was changed after this payment; edit the member instead' using errcode = '22023';
    end if;

    update public.members set next_due_date = p.period_start where id = p.member_id;
  end if;

  delete from public.payments where id = p_payment_id;
end $$;

revoke execute on function public.record_payment(uuid, numeric, int, public.payment_method, date, text, public.payment_type) from anon;
revoke execute on function public.undo_payment(uuid) from anon;
