import { supabase } from '@/lib/supabase'
import type { ReminderStatus, ReminderWithMember } from './schema'

const SELECT = '*, member:members(*, plan:plans(id, name, duration_months))'

/** Pending reminders for active members, oldest due first (the send queue). */
export async function listPendingReminders() {
  const { data, error } = await supabase
    .from('reminders')
    .select(SELECT)
    .eq('status', 'pending')
    .order('due_date')
    .order('created_at')
    .returns<ReminderWithMember[]>()
  if (error) throw error
  return data.filter((r) => r.member?.status === 'active')
}

export async function countPendingReminders() {
  const { count, error } = await supabase.from('reminders').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  if (error) throw error
  return count ?? 0
}

export const HISTORY_PAGE_SIZE = 50

export async function listReminderHistory(page: number) {
  const from = page * HISTORY_PAGE_SIZE
  const { data, error, count } = await supabase
    .from('reminders')
    .select(SELECT, { count: 'exact' })
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .range(from, from + HISTORY_PAGE_SIZE - 1)
    .returns<ReminderWithMember[]>()
  if (error) throw error
  return { reminders: data, total: count ?? 0 }
}

export async function listMemberReminders(memberId: string) {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function setReminderStatus(id: string, status: ReminderStatus) {
  const { error } = await supabase
    .from('reminders')
    .update({ status, sent_at: status === 'sent' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

export type GenerateResult = { date: string; created: number; cleared: number; pending: number }

export async function generateReminders() {
  const { data, error } = await supabase.rpc('generate_reminders', {})
  if (error) throw error
  return data as unknown as GenerateResult
}

/** Active members due between two dates (inclusive), for the "This week" / "Overdue" tabs. */
export async function listMembersDueBetween(from: string | null, to: string) {
  let q = supabase.from('members').select('*, plan:plans(id, name, duration_months)').eq('status', 'active').lte('next_due_date', to)
  if (from) q = q.gte('next_due_date', from)
  const { data, error } = await q.order('next_due_date').order('full_name').limit(500).returns<import('@/features/members/schema').MemberWithPlan[]>()
  if (error) throw error
  return data
}
