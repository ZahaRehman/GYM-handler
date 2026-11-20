import { supabase } from '@/lib/supabase'
import type { PaymentMethod, PaymentType, PaymentWithMember, RecordPaymentValues } from './schema'

export async function recordPayment(memberId: string, v: RecordPaymentValues) {
  const { data, error } = await supabase.rpc('record_payment', {
    p_member_id: memberId,
    p_amount: v.amount,
    p_months: v.months,
    p_method: v.method,
    p_paid_on: v.paid_on,
    p_note: v.note || undefined,
    p_type: v.type,
  })
  if (error) throw error
  return data
}

export async function undoPayment(paymentId: string) {
  const { error } = await supabase.rpc('undo_payment', { p_payment_id: paymentId })
  if (error) throw error
}

export async function listMemberPayments(memberId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('member_id', memberId)
    .order('paid_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export type PaymentFilters = { from: string; to: string; method: PaymentMethod | 'all'; type: PaymentType | 'all' }

const MEMBER_SELECT = '*, member:members(id, full_name, member_code, photo_public_id)'
export const PAYMENTS_PAGE_SIZE = 50

function applyFilters<T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T; eq: (c: string, v: string) => T }>(q: T, f: PaymentFilters): T {
  q = q.gte('paid_on', f.from).lte('paid_on', f.to)
  if (f.method !== 'all') q = q.eq('method', f.method)
  if (f.type !== 'all') q = q.eq('type', f.type)
  return q
}

export async function listPayments(f: PaymentFilters, page: number) {
  const from = page * PAYMENTS_PAGE_SIZE
  const { data, error, count } = await applyFilters(supabase.from('payments').select(MEMBER_SELECT, { count: 'exact' }), f)
    .order('paid_on', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, from + PAYMENTS_PAGE_SIZE - 1)
    .returns<PaymentWithMember[]>()
  if (error) throw error
  return { payments: data, total: count ?? 0 }
}

/** Totals for the filtered range (small gym scale: summing client-side is fine). */
export async function paymentTotals(f: PaymentFilters) {
  const { data, error } = await applyFilters(supabase.from('payments').select('amount, method'), f).limit(10000)
  if (error) throw error
  const byMethod = new Map<PaymentMethod, number>()
  let total = 0
  for (const p of data) {
    total += p.amount
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount)
  }
  return { total, count: data.length, byMethod: [...byMethod.entries()].sort((a, b) => b[1] - a[1]) }
}

export async function exportPayments(f: PaymentFilters) {
  const { data, error } = await applyFilters(supabase.from('payments').select(MEMBER_SELECT), f)
    .order('paid_on', { ascending: false })
    .limit(10000)
    .returns<PaymentWithMember[]>()
  if (error) throw error
  return data
}
