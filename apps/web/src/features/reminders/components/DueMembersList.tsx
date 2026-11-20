import { CalendarCheck, MessageCircle, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { DueBadge } from '@/features/members/components/DueBadge'
import { MemberAvatar } from '@/features/members/components/MemberAvatar'
import { useGymToday } from '@/features/members/hooks'
import type { MemberWithPlan } from '@/features/members/schema'
import { getDueInfo, toWaLink } from '@/features/members/utils'
import { RecordPaymentDialog } from '@/features/payments/components/RecordPaymentDialog'
import { useSettings } from '@/features/settings/hooks'
import { formatMoney } from '@/lib/format'
import { kindForDays, renderMemberMessage, templateFor } from '../message'

/** Members list with one-tap WhatsApp (message written from the template) and Paid. */
export function DueMembersList({ members, isPending, emptyTitle, emptyDescription }: {
  members: MemberWithPlan[] | undefined
  isPending: boolean
  emptyTitle: string
  emptyDescription: string
}) {
  const { today, upcomingWindowDays, currency } = useGymToday()
  const { data: settings } = useSettings()
  const [payFor, setPayFor] = useState<MemberWithPlan | null>(null)

  if (isPending) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
  if (!members?.length) return <EmptyState icon={CalendarCheck} title={emptyTitle} description={emptyDescription} />

  const total = members.reduce((s, m) => s + m.fee_amount, 0)

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">{members.length} member{members.length === 1 ? '' : 's'} · {formatMoney(total, currency)}</p>
      <ul className="divide-y rounded-xl border bg-background">
        {members.map((m) => {
          const due = getDueInfo(m.next_due_date, today, m.status, upcomingWindowDays)
          const text = settings ? renderMemberMessage(templateFor(kindForDays(due.days), settings), m, settings) : undefined
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 p-3">
              <Link to={`/members/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <MemberAvatar name={m.full_name} photoId={m.photo_public_id} size={40} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.full_name}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">{formatMoney(m.fee_amount, currency)}</span>
                </span>
              </Link>
              <DueBadge info={due} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPayFor(m)}><Wallet /> Paid</Button>
                <Button variant="outline" size="sm" aria-label={`WhatsApp ${m.full_name}`}
                  render={<a href={toWaLink(m.phone, text)} target="_blank" rel="noreferrer" />}>
                  <MessageCircle />
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
      {payFor && <RecordPaymentDialog member={payFor} open onOpenChange={(o) => !o && setPayFor(null)} />}
    </>
  )
}
