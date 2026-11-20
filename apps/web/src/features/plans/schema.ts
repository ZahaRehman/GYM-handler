import { z } from 'zod'
import type { Database } from '@/types/database'

export type Plan = Database['public']['Tables']['plans']['Row']

export const planFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  duration_months: z.number({ error: 'Required' }).int().min(1, 'At least 1 month').max(60),
  price: z.number({ error: 'Required' }).min(0, 'Cannot be negative'),
  is_active: z.boolean(),
})
export type PlanFormValues = z.infer<typeof planFormSchema>

export function durationLabel(months: number): string {
  if (months === 1) return '1 month'
  if (months === 12) return '1 year'
  if (months % 12 === 0) return `${months / 12} years`
  return `${months} months`
}
