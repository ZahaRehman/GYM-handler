import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteMemberPhoto } from '@/lib/cloudinary'
import { queryKeys } from '@/lib/queryKeys'
import { todayISO } from '@/lib/dates'
import { recordPayment } from '@/features/payments/api'
import { useSettings } from '@/features/settings/hooks'
import { addMonthsISO } from '@/lib/dates'
import { createMember, deleteMember, getMember, listMembers, setMemberStatus, updateMember, type ListMembersParams } from './api'
import { toMemberPayload, type MemberFormValues, type MemberInsert, type MemberRow, type MemberStatus } from './schema'

/** Today + reminder window from the gym's settings, used by all due-date logic. */
export function useGymToday() {
  const { data: settings } = useSettings()
  return {
    today: todayISO(settings?.timezone ?? 'Asia/Karachi'),
    upcomingWindowDays: settings?.upcoming_window_days ?? 3,
    currency: settings?.currency ?? 'PKR',
  }
}

export function useMembers(params: Omit<ListMembersParams, 'today' | 'upcomingWindowDays'>) {
  const { today, upcomingWindowDays } = useGymToday()
  const full = { ...params, today, upcomingWindowDays }
  return useQuery({
    queryKey: [...queryKeys.members.all, 'list', full],
    queryFn: () => listMembers(full),
    placeholderData: keepPreviousData,
  })
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.members.detail(id ?? ''),
    queryFn: () => getMember(id!),
    enabled: !!id,
  })
}

function useInvalidateMembers() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.members.all })
    qc.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  }
}

/**
 * Create a member and, optionally, record their first fee + admission fee.
 * With a first payment the member is saved as due on the join date and
 * record_payment() moves the due date forward, so history and dates always agree.
 */
export function useRegisterMember() {
  const invalidate = useInvalidateMembers()
  const qc = useQueryClient()
  const { today } = useGymToday()
  return useMutation({
    mutationFn: async ({ values, planMonths }: { values: MemberFormValues; planMonths: number }) => {
      const payload = toMemberPayload(values)
      const collect = values.collect_payment
      if (collect) {
        payload.next_due_date = values.fee_amount > 0 ? values.join_date : addMonthsISO(values.join_date, planMonths)
      }
      const member = await createMember(payload)
      const paidOn = values.join_date < today ? values.join_date : today
      const warnings: string[] = []
      if (collect && values.fee_amount > 0) {
        try {
          await recordPayment(member.id, { type: 'membership', months: 1, amount: values.fee_amount, method: values.payment_method, paid_on: paidOn, note: '' })
        } catch (e) {
          warnings.push(`first fee was not recorded (${(e as Error).message})`)
        }
      }
      if (collect && values.admission_fee > 0) {
        try {
          await recordPayment(member.id, { type: 'admission', months: 1, amount: values.admission_fee, method: values.payment_method, paid_on: paidOn, note: 'Admission fee' })
        } catch (e) {
          warnings.push(`admission fee was not recorded (${(e as Error).message})`)
        }
      }
      return { member, warnings }
    },
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: queryKeys.payments.all })
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateMember() {
  const invalidate = useInvalidateMembers()
  return useMutation({
    mutationFn: async ({ id, payload, previousPhotoId }: { id: string; payload: Partial<MemberInsert>; previousPhotoId?: string | null }) => {
      const updated = await updateMember(id, payload)
      if (previousPhotoId && previousPhotoId !== updated.photo_public_id) void deleteMemberPhoto(previousPhotoId)
      return updated
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  })
}

const statusToast: Record<MemberStatus, string> = {
  active: 'Membership re-activated',
  paused: 'Membership paused',
  left: 'Marked as left',
}

export function useSetMemberStatus() {
  const invalidate = useInvalidateMembers()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MemberStatus }) => setMemberStatus(id, status),
    onSuccess: (_d, v) => {
      invalidate()
      toast.success(statusToast[v.status])
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteMember() {
  const invalidate = useInvalidateMembers()
  return useMutation({
    mutationFn: async (member: Pick<MemberRow, 'id' | 'photo_public_id'>) => {
      await deleteMember(member.id)
      if (member.photo_public_id) void deleteMemberPhoto(member.photo_public_id)
    },
    onSuccess: () => {
      invalidate()
      toast.success('Member deleted')
    },
    onError: (e) => toast.error(e.message),
  })
}
