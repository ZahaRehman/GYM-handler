import { z } from 'zod'
import type { Database } from '@/types/database'

type Enums = Database['public']['Enums']
export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentMethod = Enums['payment_method']
export type PaymentType = Enums['payment_type']
export type PaymentWithMember = Payment & { member: { id: string; full_name: string; member_code: number; photo_public_id: string | null } | null }

export const paymentMethods = ['cash', 'jazzcash', 'easypaisa', 'bank', 'card', 'other'] as const satisfies readonly PaymentMethod[]
export const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash', bank: 'Bank', jazzcash: 'JazzCash', easypaisa: 'Easypaisa', card: 'Card', other: 'Other',
}

export const paymentTypes = ['membership', 'admission', 'personal_training', 'other'] as const satisfies readonly PaymentType[]
export const typeLabels: Record<PaymentType, string> = {
  membership: 'Membership fee', admission: 'Admission fee', personal_training: 'Personal training', other: 'Other',
}

export const monthOptions = [1, 2, 3, 6, 12] as const

export const recordPaymentSchema = z.object({
  type: z.enum(paymentTypes),
  months: z.number().int().min(1).max(36),
  amount: z.number({ error: 'Enter the amount' }).positive('Amount must be more than 0'),
  method: z.enum(paymentMethods),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  note: z.string().trim().max(300),
})
export type RecordPaymentValues = z.infer<typeof recordPaymentSchema>
