import { addDays, format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { MemberFilter, MemberInsert, MemberSort, MemberStatus, MemberWithPlan } from './schema'

export const PAGE_SIZE = 25
const SELECT = '*, plan:plans(id, name, duration_months)'

export type ListMembersParams = {
  search: string
  filter: MemberFilter
  sort: MemberSort
  page: number
  today: string
  upcomingWindowDays: number
}

/** Strip characters that have meaning in PostgREST `or=` filters. */
function sanitizeSearch(s: string) {
  return s.replace(/[,()*%\\]/g, ' ').trim()
}

export async function listMembers(p: ListMembersParams) {
  let q = supabase.from('members').select(SELECT, { count: 'exact' })
  const windowEnd = format(addDays(parseISO(p.today), p.upcomingWindowDays), 'yyyy-MM-dd')

  switch (p.filter) {
    case 'all': q = q.neq('status', 'left'); break
    case 'paused': q = q.eq('status', 'paused'); break
    case 'left': q = q.eq('status', 'left'); break
    case 'overdue': q = q.eq('status', 'active').lt('next_due_date', p.today); break
    case 'due_today': q = q.eq('status', 'active').eq('next_due_date', p.today); break
    case 'due_soon': q = q.eq('status', 'active').gt('next_due_date', p.today).lte('next_due_date', windowEnd); break
    case 'paid': q = q.eq('status', 'active').gt('next_due_date', windowEnd); break
  }

  const term = sanitizeSearch(p.search)
  if (term) {
    const ors = [`full_name.ilike.*${term}*`]
    const digits = term.replace(/\D/g, '')
    if (digits.length >= 3) ors.push(`phone.ilike.*${digits.replace(/^0+/, '')}*`)
    if (/^\d{1,9}$/.test(term)) ors.push(`member_code.eq.${term}`)
    q = q.or(ors.join(','))
  }

  if (p.sort === 'name') q = q.order('full_name')
  else if (p.sort === 'newest') q = q.order('join_date', { ascending: false }).order('created_at', { ascending: false })
  else q = q.order('next_due_date').order('full_name')

  const from = p.page * PAGE_SIZE
  const { data, error, count } = await q.range(from, from + PAGE_SIZE - 1).returns<MemberWithPlan[]>()
  if (error) throw error
  return { members: data, total: count ?? 0 }
}

export async function getMember(id: string) {
  const { data, error } = await supabase.from('members').select(SELECT).eq('id', id).returns<MemberWithPlan[]>().maybeSingle()
  if (error) throw error
  return data
}

export async function createMember(payload: MemberInsert) {
  const { data, error } = await supabase.from('members').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateMember(id: string, payload: Partial<MemberInsert>) {
  const { data, error } = await supabase.from('members').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function setMemberStatus(id: string, status: MemberStatus) {
  return updateMember(id, { status })
}

export async function deleteMember(id: string) {
  const { error } = await supabase.from('members').delete().eq('id', id)
  if (error) throw error
}
