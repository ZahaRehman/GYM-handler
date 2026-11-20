import { addDays, format, parseISO, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, History, Undo2 } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { MemberAvatar } from '@/features/members/components/MemberAvatar'
import { useGymToday } from '@/features/members/hooks'
import { formatDate } from '@/lib/format'
import { HISTORY_PAGE_SIZE } from '../api'
import { DueMembersList } from '../components/DueMembersList'
import { ReminderQueue, StatusBadge } from '../components/ReminderQueue'
import { useMembersDueBetween, usePendingReminderCount, useReminderHistory, useSetReminderStatus } from '../hooks'
import { kindDetail } from '../schema'

const tabs = ['send', 'overdue', 'week', 'history'] as const
type Tab = (typeof tabs)[number]

export function DuesPage() {
  const { today, currency } = useGymToday()
  const [params, setParams] = useSearchParams()
  const tab: Tab = (tabs as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : 'send'
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0)
  const yesterday = format(subDays(parseISO(today), 1), 'yyyy-MM-dd')
  const weekEnd = format(addDays(parseISO(today), 7), 'yyyy-MM-dd')

  const pendingCount = usePendingReminderCount()
  const setStatus = useSetReminderStatus()
  const overdue = useMembersDueBetween(null, yesterday, tab === 'overdue')
  const week = useMembersDueBetween(today, weekEnd, tab === 'week')
  const history = useReminderHistory(page, tab === 'history')
  const pages = Math.max(1, Math.ceil((history.data?.total ?? 0) / HISTORY_PAGE_SIZE))

  return (
    <>
      <PageHeader title="Dues & Reminders" description="Who owes fees, and today's WhatsApp reminders" />
      <Tabs value={tab} onValueChange={(v) => setParams(v === 'send' ? {} : { tab: String(v) }, { replace: true })}>
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="send">To send{pendingCount.data ? ` (${pendingCount.data})` : ''}</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="week">Next 7 days</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="send"><ReminderQueue currency={currency} /></TabsContent>

        <TabsContent value="overdue">
          <DueMembersList members={overdue.data} isPending={overdue.isPending}
            emptyTitle="Nobody is overdue" emptyDescription="Every active member has paid on time." />
        </TabsContent>

        <TabsContent value="week">
          <DueMembersList members={week.data} isPending={week.isPending}
            emptyTitle="No fees due this week" emptyDescription={`Nobody is due between ${formatDate(today)} and ${formatDate(weekEnd)}.`} />
        </TabsContent>

        <TabsContent value="history">
          {history.isPending ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !history.data?.reminders.length ? (
            <EmptyState icon={History} title="No reminder history yet" description="Sent and skipped reminders show up here." />
          ) : (
            <>
              <ul className="divide-y rounded-xl border bg-background">
                {history.data.reminders.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 p-3">
                    <MemberAvatar name={r.member?.full_name ?? '?'} photoId={r.member?.photo_public_id ?? null} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.member?.full_name ?? 'Deleted member'}</span>
                        <StatusBadge status={r.status} />
                        <span className="text-xs text-muted-foreground">{kindDetail(r)}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{r.message}</p>
                      {r.error && <p className="mt-1 text-xs text-destructive">{r.error}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">{formatDate((r.sent_at ?? r.created_at).slice(0, 10))}</span>
                      {r.member?.status === 'active' && r.due_date === r.member.next_due_date && (
                        <Button variant="ghost" size="xs" onClick={() => setStatus.mutate({ id: r.id, status: 'pending' })}>
                          <Undo2 /> Back to queue
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Page {page + 1} of {pages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setParams({ tab: 'history', page: String(page - 1) })}><ChevronLeft /> Prev</Button>
                    <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setParams({ tab: 'history', page: String(page + 1) })}>Next <ChevronRight /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
