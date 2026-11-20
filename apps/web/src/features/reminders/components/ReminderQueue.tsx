import { CheckCheck, MessageCircle, RefreshCw, SkipForward, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { MemberAvatar } from '@/features/members/components/MemberAvatar'
import type { MemberWithPlan } from '@/features/members/schema'
import { toWaLink } from '@/features/members/utils'
import { RecordPaymentDialog } from '@/features/payments/components/RecordPaymentDialog'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useGenerateReminders, usePendingReminders, useSetReminderStatus } from '../hooks'
import { kindDetail, type ReminderWithMember } from '../schema'

const kindStyle = {
  before_due: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  on_due: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  receipt: 'bg-slate-100 text-slate-700',
} as const

export function ReminderQueue({ currency }: { currency: string }) {
  const { data: reminders, isPending, isError, error } = usePendingReminders()
  const setStatus = useSetReminderStatus()
  const generate = useGenerateReminders()
  const [payFor, setPayFor] = useState<MemberWithPlan | null>(null)

  const markSent = (r: ReminderWithMember) => {
    setStatus.mutate({ id: r.id, status: 'sent' })
    toast.success(`Marked sent to ${r.member?.full_name}`, {
      action: { label: 'Undo', onClick: () => setStatus.mutate({ id: r.id, status: 'pending' }) },
      duration: 10000,
    })
  }
  const skip = (r: ReminderWithMember) => {
    setStatus.mutate({ id: r.id, status: 'skipped' })
    toast(`Skipped ${r.member?.full_name}`, {
      action: { label: 'Undo', onClick: () => setStatus.mutate({ id: r.id, status: 'pending' }) },
      duration: 10000,
    })
  }

  const header = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        New reminders are added automatically every day at 9 AM. Tap <b>Send</b>, WhatsApp opens with the message ready, then press send there.
      </p>
      <Button variant="outline" size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
        <RefreshCw className={cn(generate.isPending && 'animate-spin')} /> Check now
      </Button>
    </div>
  )

  if (isError) return <>{header}<EmptyState icon={MessageCircle} title="Could not load reminders" description={error.message} /></>
  if (isPending) return <>{header}<div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div></>
  if (!reminders.length) {
    return <>{header}<EmptyState icon={CheckCheck} title="All caught up" description="No reminders waiting to be sent. Nice work!" /></>
  }

  return (
    <>
      {header}
      <ul className="space-y-2">
        {reminders.map((r) => r.member && (
          <li key={r.id} className="rounded-xl border bg-background p-3">
            <div className="flex items-start gap-3">
              <Link to={`/members/${r.member.id}`}><MemberAvatar name={r.member.full_name} photoId={r.member.photo_public_id} size={44} /></Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/members/${r.member.id}`} className="font-medium hover:underline">{r.member.full_name}</Link>
                  <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-xs font-medium', kindStyle[r.kind])}>{kindDetail(r)}</span>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatMoney(r.member.fee_amount, currency)} · due {formatDate(r.due_date)}
                </div>
                <p className="mt-2 line-clamp-2 rounded-lg bg-muted px-3 py-2 text-sm">{r.message}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => skip(r)}><SkipForward /> Skip</Button>
              <Button variant="outline" size="sm" onClick={() => setPayFor(r.member)}><Wallet /> Paid</Button>
              <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5b]"
                render={<a href={toWaLink(r.member.phone, r.message)} target="_blank" rel="noreferrer" onClick={() => markSent(r)} />}>
                <MessageCircle /> Send on WhatsApp
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-xs text-muted-foreground">{reminders.length} to send</p>
      {payFor && <RecordPaymentDialog member={payFor} open onOpenChange={(o) => !o && setPayFor(null)} />}
    </>
  )
}

export function StatusBadge({ status }: { status: ReminderWithMember['status'] }) {
  const variant = status === 'sent' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'
  return <Badge variant={variant} className="capitalize">{status}</Badge>
}
