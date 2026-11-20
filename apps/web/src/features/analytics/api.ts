import { supabase } from '@/lib/supabase'
import type { AnalyticsSummary, DashboardStats, OverdueRow } from './schema'

// Postgres numeric arrives as number here; jsonb numbers are numbers too.
export async function fetchDashboardStats(month: string) {
  const { data, error } = await supabase.rpc('dashboard_stats', { p_month: month })
  if (error) throw error
  return data as unknown as DashboardStats
}

export async function fetchAnalytics(from: string, to: string) {
  const { data, error } = await supabase.rpc('analytics_summary', { p_from: from, p_to: to })
  if (error) throw error
  return data as unknown as AnalyticsSummary
}

export async function fetchTopOverdue(limit = 10) {
  const { data, error } = await supabase.rpc('top_overdue', { p_limit: limit })
  if (error) throw error
  return data as OverdueRow[]
}

export async function fetchRecentPayments(limit = 5) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, method, type, paid_on, member:members(id, full_name, photo_public_id)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
