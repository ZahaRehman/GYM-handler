import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { fetchAnalytics, fetchDashboardStats, fetchRecentPayments, fetchTopOverdue } from './api'

export function useDashboardStats(month: string) {
  return useQuery({ queryKey: [...queryKeys.dashboard.all, 'stats', month], queryFn: () => fetchDashboardStats(month), placeholderData: keepPreviousData })
}

export function useAnalytics(from: string, to: string) {
  return useQuery({ queryKey: [...queryKeys.dashboard.all, 'analytics', from, to], queryFn: () => fetchAnalytics(from, to), placeholderData: keepPreviousData })
}

export function useTopOverdue(limit = 10) {
  return useQuery({ queryKey: [...queryKeys.dashboard.all, 'top-overdue', limit], queryFn: () => fetchTopOverdue(limit) })
}

export function useRecentPayments(limit = 5) {
  return useQuery({ queryKey: [...queryKeys.payments.all, 'recent', limit], queryFn: () => fetchRecentPayments(limit) })
}
