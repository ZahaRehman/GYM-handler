import { z } from 'zod'
import type { Database } from '@/types/database'
import { paymentMethods } from '@/features/payments/schema'
import { normalizePhone } from './utils'

type Tables = Database['public']['Tables']
export type MemberRow = Tables['members']['Row']
export type MemberInsert = Tables['members']['Insert']
export type MemberStatus = Database['public']['Enums']['member_status']
export type Gender = Database['public']['Enums']['gender_type']
export type MemberWithPlan = MemberRow & { plan: { id: string; name: string; duration_months: number } | null }

export const memberFilters = ['all', 'overdue', 'due_today', 'due_soon', 'paid', 'paused', 'left'] as const
export type MemberFilter = (typeof memberFilters)[number]
export const memberFilterLabels: Record<MemberFilter, string> = {
  all: 'All', overdue: 'Overdue', due_today: 'Due today', due_soon: 'Due soon', paid: 'Paid', paused: 'Paused', left: 'Left',
}

export const memberSorts = ['due', 'name', 'newest'] as const
export type MemberSort = (typeof memberSorts)[number]

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')
const optionalText = z.string().trim().max(500)

export const memberFormSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Enter the full name').max(100),
    phone: z.string().trim().min(1, 'Phone is required').refine((v) => normalizePhone(v) !== null, 'Enter a valid mobile number'),
    gender: z.enum(['', 'male', 'female', 'other']),
    date_of_birth: z.union([z.literal(''), dateString]),
    address: optionalText,
    fee_amount: z.number({ error: 'Enter the fee' }).min(0, 'Cannot be negative'),
    join_date: dateString,
    next_due_date: dateString,
    notes: optionalText,
    photo_public_id: z.string().nullable(),
    // New members only: collect the first fee while registering.
    collect_payment: z.boolean(),
    payment_method: z.enum(paymentMethods),
    admission_fee: z.union([z.nan(), z.number().min(0, 'Cannot be negative')]),
  })
  .refine((v) => v.next_due_date >= v.join_date, { path: ['next_due_date'], message: 'Due date cannot be before join date' })

export type MemberFormValues = z.infer<typeof memberFormSchema>

/** Convert validated form values into a DB row payload. */
export function toMemberPayload(v: MemberFormValues): Omit<MemberInsert, 'status'> {
  const nullIfEmpty = (s: string) => (s.trim() === '' ? null : s.trim())
  return {
    full_name: v.full_name.trim(),
    phone: normalizePhone(v.phone)!,
    gender: v.gender === '' ? null : v.gender,
    date_of_birth: nullIfEmpty(v.date_of_birth),
    address: nullIfEmpty(v.address),
    fee_amount: v.fee_amount,
    join_date: v.join_date,
    next_due_date: v.next_due_date,
    notes: nullIfEmpty(v.notes),
    photo_public_id: v.photo_public_id,
  }
}

export function toFormValues(m: MemberRow): MemberFormValues {
  return {
    full_name: m.full_name,
    phone: m.phone,
    gender: m.gender ?? '',
    date_of_birth: m.date_of_birth ?? '',
    address: m.address ?? '',
    fee_amount: m.fee_amount,
    join_date: m.join_date,
    next_due_date: m.next_due_date,
    notes: m.notes ?? '',
    photo_public_id: m.photo_public_id,
    collect_payment: false,
    payment_method: 'cash',
    admission_fee: Number.NaN,
  }
}
