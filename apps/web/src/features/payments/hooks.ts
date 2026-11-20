import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queryKeys'
import { listMemberPayments, listPayments, paymentTotals, recordPayment, undoPayment, type PaymentFilters } from './api'
import type { RecordPaymentValues } from './schema'

function useInvalidateMoney() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.payments.all })
    qc.invalidateQueries({ queryKey: queryKeys.members.all })
    qc.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    qc.invalidateQueries({ queryKey: queryKeys.reminders.all })
  }
}

export function useMemberPayments(memberId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payments.member(memberId ?? ''),
    queryFn: () => listMemberPayments(memberId!),
    enabled: !!memberId,
  })
}

export function usePayments(filters: PaymentFilters, page: number) {
  return useQuery({
    queryKey: [...queryKeys.payments.all, 'list', filters, page],
    queryFn: () => listPayments(filters, page),
    placeholderData: keepPreviousData,
  })
}

export function usePaymentTotals(filters: PaymentFilters) {
  return useQuery({
    queryKey: [...queryKeys.payments.all, 'totals', filters],
    queryFn: () => paymentTotals(filters),
    placeholderData: keepPreviousData,
  })
}

export function useRecordPayment() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: ({ memberId, values }: { memberId: string; values: RecordPaymentValues }) => recordPayment(memberId, values),
    onSuccess: invalidate,
    onError: (e) => toast.error(`Could not record payment: ${e.message}`),
  })
}

export function useUndoPayment() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: undoPayment,
    onSuccess: () => {
      invalidate()
      toast.success('Payment undone')
    },
    onError: (e) => toast.error(e.message),
  })
}
