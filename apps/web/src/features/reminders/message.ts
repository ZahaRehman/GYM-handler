import { formatDate } from '@/lib/format'
import { renderTemplate } from '@/lib/template'
import type { Database } from '@/types/database'
import type { MemberRow } from '@/features/members/schema'

type Settings = Database['public']['Tables']['settings']['Row']
export type MessageKind = 'before_due' | 'on_due' | 'overdue'

export const SAMPLE_MEMBER = { full_name: 'Ali Raza', fee_amount: 3000, next_due_date: '2026-12-01', member_code: 1001 }

/** Same placeholders and formatting as public.render_member_message() in SQL. */
export function renderMemberMessage(template: string, member: Pick<MemberRow, 'full_name' | 'fee_amount' | 'next_due_date' | 'member_code'>,
  settings: Pick<Settings, 'gym_name' | 'currency'>) {
  return renderTemplate(template, {
    name: member.full_name.trim().split(/\s+/)[0],
    gym: settings.gym_name,
    currency: settings.currency === 'PKR' ? 'Rs' : settings.currency,
    amount: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(member.fee_amount),
    due_date: formatDate(member.next_due_date),
    member_code: member.member_code,
  })
}

export function templateFor(kind: MessageKind, s: Settings) {
  return kind === 'overdue' ? s.template_overdue : kind === 'on_due' ? s.template_on_due : s.template_before_due
}

export function kindForDays(daysUntilDue: number): MessageKind {
  return daysUntilDue < 0 ? 'overdue' : daysUntilDue === 0 ? 'on_due' : 'before_due'
}
