import { addMonths, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns'
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, MessageCircle, Receipt, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { MonthlyBarChart } from '@/features/analytics/components/charts'
import { KpiTile } from '@/features/analytics/components/KpiTile'
import { useAnalytics, useDashboardStats, useRecentPayments, useTopOverdue } from '@/features/analytics/hooks'
import { percentChange } from '@/features/analytics/schema'
import { useAdminProfile } from '@/features/auth/hooks'
import { MemberAvatar } from '@/features/members/components/MemberAvatar'
import { useGymToday } from '@/features/members/hooks'
import { methodLabels } from '@/features/payments/schema'
import { usePendingReminderCount } from '@/features/reminders/hooks'
import { formatDate, formatMoney } from '@/lib/format'

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

function greeting(hour: number) {
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

export function DashboardPage() {
  const { data: admin } = useAdminProfile()
  const { today, currency } = useGymToday()
  const [hour] = useState(() => new Date().getHours())
  const thisMonth = ymd(startOfMonth(parseISO(today)))
  const [month, setMonth] = useState(thisMonth)
  const isCurrent = month === thisMonth
  const monthDate = parseISO(month)

  const stats = useDashboardStats(month)
  const trend = useAnalytics(ymd(startOfMonth(subMonths(monthDate, 5))), ymd(endOfMonth(monthDate)))
  const { data: pending } = usePendingReminderCount()
  const overdue = useTopOverdue(5)
  const recent = useRecentPayments(5)
  const s = stats.data
  const money = (v: number) => formatMoney(v, currency)
  const first = admin?.full_name?.split(' ')[0]
  const prevLabel = format(subMonths(monthDate, 1), 'MMM')

  return (
    <>
      <PageHeader title={`${greeting(hour)}${first ? `, ${first}` : ''}`} description={formatDate(today)}
        actions={
          <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
            <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => setMonth(ymd(subMonths(monthDate, 1)))}><ChevronLeft /></Button>
            <span className="min-w-28 text-center text-sm font-medium">{format(monthDate, 'MMMM yyyy')}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Next month" disabled={isCurrent} onClick={() => setMonth(ymd(addMonths(monthDate, 1)))}><ChevronRight /></Button>
          </div>
        } />

      {isCurrent && (
        <Link to="/dues" className="mb-4 flex items-center gap-3 rounded-xl border bg-background p-4 transition-colors hover:bg-muted/50">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E]"><MessageCircle className="size-5" /></div>
          <div className="flex-1">
            <div className="font-medium">{pending ? `${pending} reminder${pending === 1 ? '' : 's'} to send today` : 'No reminders to send'}</div>
            <div className="text-sm text-muted-foreground">{pending ? 'Open the queue and send them on WhatsApp' : 'You are all caught up'}</div>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon={Wallet} label={`Collected in ${format(monthDate, 'MMM')}`} loading={stats.isPending}
          value={s && money(s.collected)}
          delta={s ? percentChange(s.collected, s.is_current_month ? s.collected_prev_to_date : s.collected_prev) : null}
          deltaLabel={s?.is_current_month ? `vs ${prevLabel} 1–${format(parseISO(today), 'd')}` : `vs ${prevLabel}`}
          sub={s && <span>{s.payments_count} payments</span>} />
        {isCurrent ? (
          <KpiTile icon={CalendarClock} label="Still to collect" loading={stats.isPending}
            value={s && money(s.pending_amount)} sub={s && <span>{s.pending_count} members due by {format(endOfMonth(monthDate), 'd MMM')}</span>} />
        ) : (
          <KpiTile icon={Receipt} label="Average payment" loading={stats.isPending}
            value={s && money(s.payments_count ? Math.round(s.collected / s.payments_count) : 0)} sub={s && <span>across {s.payments_count} payments</span>} />
        )}
        <KpiTile icon={AlertTriangle} label="Overdue now" loading={stats.isPending} tone={s?.overdue_count ? 'danger' : undefined}
          value={s && money(s.overdue_amount)} sub={s && <span>{s.overdue_count} member{s.overdue_count === 1 ? '' : 's'}</span>} />
        <KpiTile icon={Users} label="Active members" loading={stats.isPending}
          value={s?.active_members} sub={s && <span>+{s.new_members} joined in {format(monthDate, 'MMM')}{s.paused_members ? ` · ${s.paused_members} paused` : ''}</span>} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue, last 6 months</CardTitle>
            <CardAction><Button variant="ghost" size="sm" render={<Link to="/analytics" />}>Analytics <ChevronRight /></Button></CardAction>
          </CardHeader>
          <CardContent>
            {trend.isPending ? <Skeleton className="h-60 w-full" /> : (
              <MonthlyBarChart label="Revenue per month for the last 6 months" money currency={currency} highlightMonth={month}
                data={(trend.data?.by_month ?? []).map((r) => ({ month: r.month, value: r.total, detail: `${r.payments} payments` }))} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Owing the most</CardTitle>
            <CardAction><Button variant="ghost" size="sm" render={<Link to="/dues?tab=overdue" />}>All <ChevronRight /></Button></CardAction>
          </CardHeader>
          <CardContent>
            {overdue.isPending ? <Skeleton className="h-48 w-full" /> : !overdue.data?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nobody is overdue 🎉</p>
            ) : (
              <ul className="space-y-3">
                {overdue.data.map((o) => (
                  <li key={o.id}>
                    <Link to={`/members/${o.id}`} className="flex items-center gap-3 hover:opacity-80">
                      <MemberAvatar name={o.full_name} photoId={o.photo_public_id} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{o.full_name}</span>
                        <span className="block text-xs text-muted-foreground">{o.days_overdue} days late{o.cycles > 1 ? ` · ${o.cycles} months` : ''}</span>
                      </span>
                      <span className="text-sm font-semibold text-red-600 tabular-nums dark:text-red-400">{money(o.amount_due)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent payments</CardTitle>
          <CardAction><Button variant="ghost" size="sm" render={<Link to="/payments" />}>All <ChevronRight /></Button></CardAction>
        </CardHeader>
        <CardContent>
          {recent.isPending ? <Skeleton className="h-40 w-full" /> : !recent.data?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No payments yet</p>
          ) : (
            <ul className="divide-y">
              {recent.data.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <MemberAvatar name={p.member?.full_name ?? '?'} photoId={p.member?.photo_public_id ?? null} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.member?.full_name ?? 'Deleted member'}</span>
                    <span className="block text-xs text-muted-foreground">{formatDate(p.paid_on)} · {methodLabels[p.method]}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
