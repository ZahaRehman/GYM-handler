import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queryKeys'
import { createPlan, deletePlan, listPlans, updatePlan } from './api'
import type { PlanFormValues } from './schema'

export function usePlans() {
  return useQuery({ queryKey: queryKeys.plans.all, queryFn: listPlans })
}

function useInvalidatePlans() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.plans.all })
}

export function useSavePlan() {
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: PlanFormValues }) =>
      id ? updatePlan(id, values) : createPlan(values),
    onSuccess: (_d, v) => {
      invalidate()
      toast.success(v.id ? 'Plan updated' : 'Plan added')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useTogglePlan() {
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updatePlan(id, { is_active }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  })
}

export function useDeletePlan() {
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      invalidate()
      toast.success('Plan deleted')
    },
    onError: (e) => toast.error(e.message),
  })
}
