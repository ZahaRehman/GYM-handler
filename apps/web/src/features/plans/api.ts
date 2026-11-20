import { supabase } from '@/lib/supabase'
import type { PlanFormValues } from './schema'

export async function listPlans() {
  const { data, error } = await supabase.from('plans').select('*').order('duration_months').order('price')
  if (error) throw error
  return data
}

export async function createPlan(values: PlanFormValues) {
  const { data, error } = await supabase.from('plans').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updatePlan(id: string, values: Partial<PlanFormValues>) {
  const { data, error } = await supabase.from('plans').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deletePlan(id: string) {
  const { error } = await supabase.from('plans').delete().eq('id', id)
  if (error) throw error
}

export async function countMembersOnPlan(id: string) {
  const { count, error } = await supabase.from('members').select('id', { count: 'exact', head: true }).eq('plan_id', id)
  if (error) throw error
  return count ?? 0
}
