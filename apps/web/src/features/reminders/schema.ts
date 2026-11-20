import type { Database } from '@/types/database'
import type { MemberWithPlan } from '@/features/members/schema'

export type Reminder = Database['public']['Tables']['reminders']['Row']
export type ReminderKind = Database['public']['Enums']['reminder_kind']
export type ReminderStatus = Database['public']['Enums']['reminder_status']
export type ReminderWithMember = Reminder & { member: MemberWithPlan | null }

export const kindLabels: Record<ReminderKind, string> = {
  before_due: 'Due soon',
  on_due: 'Due today',
  overdue: 'Overdue',
  receipt: 'Receipt',
}

export const statusLabels: Record<ReminderStatus, string> = {
  pending: 'To send',
  sent: 'Sent',
  failed: 'Failed',
  skipped: 'Skipped',
}

export function kindDetail(r: Pick<Reminder, 'kind' | 'sequence'>): string {
  if (r.kind === 'before_due') return `${r.sequence} day${r.sequence === 1 ? '' : 's'} before`
  if (r.kind === 'overdue') return `Overdue reminder ${r.sequence}`
  return kindLabels[r.kind]
}
