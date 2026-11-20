import type { PaymentMethod, PaymentType } from '@/features/payments/schema'

export type DashboardStats = {
  month: string
  today: string
  collected: number
  payments_count: number
  collected_prev: number
  collected_prev_to_date: number
  is_current_month: boolean
  pending_amount: number
  pending_count: number
  overdue_amount: number
  overdue_count: number
  due_today_count: number
  due_week_count: number
  active_members: number
  paused_members: number
  new_members: number
  new_members_prev: number
}

export type MonthRow = { month: string; total: number; membership: number; other: number; payments: number; new_members: number }

export type AnalyticsSummary = {
  from: string
  to: string
  total: number
  payments: number
  members_paid: number
  by_month: MonthRow[]
  by_method: { method: PaymentMethod; total: number; payments: number }[]
  by_type: { type: PaymentType; total: number; payments: number }[]
  by_plan: { plan: string; total: number; payments: number }[]
  on_time: number
  late: number
}

export type OverdueRow = {
  id: string; full_name: string; member_code: number; phone: string; photo_public_id: string | null
  next_due_date: string; days_overdue: number; cycles: number; amount_due: number
}

/** % change, or null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}
