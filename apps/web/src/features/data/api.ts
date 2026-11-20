import { supabase } from '@/lib/supabase'
import type { MemberInsert } from '@/features/members/schema'

export async function fetchExistingPhones() {
  const { data, error } = await supabase.from('members').select('phone').limit(20000)
  if (error) throw error
  return new Set(data.map((m) => m.phone))
}

/** Insert in batches of 100 so a big file doesn't hit request limits. */
export async function insertMembers(rows: MemberInsert[], onProgress?: (done: number) => void) {
  let done = 0
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { error } = await supabase.from('members').insert(chunk)
    if (error) throw new Error(`Stopped after ${done} members: ${error.message}`)
    done += chunk.length
    onProgress?.(done)
  }
  return done
}

export async function exportAllMembers() {
  const { data, error } = await supabase.from('members').select('*, plan:plans(name)').order('member_code').limit(20000)
  if (error) throw error
  return data
}

export async function exportAllPayments() {
  const { data, error } = await supabase.from('payments').select('*, member:members(member_code, full_name)').order('paid_on').limit(50000)
  if (error) throw error
  return data
}
