import type { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'

export async function fetchSettings() {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()
  if (error) throw error
  return data
}

export type SettingsUpdate = Database['public']['Tables']['settings']['Update']

export async function updateSettings(patch: SettingsUpdate) {
  const { data, error } = await supabase.from('settings').update(patch).eq('id', 1).select().single()
  if (error) throw error
  return data
}
