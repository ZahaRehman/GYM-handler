import { MessageCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/format'
import { useMemberReminders } from '../hooks'
import { kindDetail } from '../schema'
import { StatusBadge } from './ReminderQueue'

export function MemberReminders({ memberId }: { memberId: string }) {
  const { data, isPending } = useMemberReminders(memberId)
  if (isPending) return <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
  if (!data?.length) return <EmptyState icon={MessageCircle} title="No reminders yet" description="Reminders appear here when their fee is coming up or overdue." />
  return (
    <ol className="divide-y rounded-xl border bg-background">
      {data.map((r) => (
        <li key={r.id} className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            <span className="text-sm font-medium">{kindDetail(r)}</span>
            <span className="ml-auto text-xs text-muted-foreground">{formatDate((r.sent_at ?? r.created_at).slice(0, 10))}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{r.message}</p>
        </li>
      ))}
    </ol>
  )
}
