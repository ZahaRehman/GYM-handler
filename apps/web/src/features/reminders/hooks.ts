import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queryKeys'
import { countPendingReminders, generateReminders, listMemberReminders, listMembersDueBetween, listPendingReminders, listReminderHistory, setReminderStatus } from './api'
import type { ReminderStatus, ReminderWithMember } from './schema'

export function usePendingReminders() {
  return useQuery({ queryKey: [...queryKeys.reminders.all, 'pending'], queryFn: listPendingReminders })
}

export function usePendingReminderCount() {
  return useQuery({ queryKey: [...queryKeys.reminders.all, 'count'], queryFn: countPendingReminders, refetchInterval: 5 * 60_000 })
}

export function useReminderHistory(page: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.reminders.all, 'history', page],
    queryFn: () => listReminderHistory(page),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useMemberReminders(memberId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reminders.member(memberId ?? ''),
    queryFn: () => listMemberReminders(memberId!),
    enabled: !!memberId,
  })
}

/** Optimistic: the row leaves the queue immediately; a toast offers Undo. */
export function useSetReminderStatus() {
  const qc = useQueryClient()
  const pendingKey = [...queryKeys.reminders.all, 'pending']
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReminderStatus }) => setReminderStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: pendingKey })
      const previous = qc.getQueryData<ReminderWithMember[]>(pendingKey)
      if (previous && status !== 'pending') qc.setQueryData(pendingKey, previous.filter((r) => r.id !== id))
      return { previous }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(pendingKey, ctx.previous)
      toast.error(e.message)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.reminders.all }),
  })
}

export function useGenerateReminders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: generateReminders,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: queryKeys.reminders.all })
      toast.success(r.created ? `${r.created} new reminder${r.created === 1 ? '' : 's'} added` : 'Already up to date. No new reminders today.')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useMembersDueBetween(from: string | null, to: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.members.all, 'due-between', from, to],
    queryFn: () => listMembersDueBetween(from, to),
    enabled,
  })
}
