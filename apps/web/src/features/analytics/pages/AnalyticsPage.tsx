import { endOfMonth, format, parseISO, startOfMonth, startOfYear, subMonths } from 'date-fns'
import { BarChart3, CalendarCheck, Download, Receipt, Table2, TrendingUp, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { MemberAvatar } from '@/features/members/components/MemberAvatar'
import { useGymToday } from '@/features/members/hooks'
import { formatPhone } from '@/features/members/utils'
import { methodLabels, typeLabels } from '@/features/payments/schema'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { MonthlyBarChart, RankedBars } from '../components/charts'
import { KpiTile } from '../components/KpiTile'
import { useAnalytics, useTopOverdue } from '../hooks'

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
const presets = { m3: 'Last 3 months', m6: 'Last 6 months', m12: 'Last 12 months', year: 'This year', custom: 'Custom' } as const
type Preset = keyof typeof presets

function range(p: Exclude<Preset, 'custom'>, todayISO: string) {
  const t = parseISO(todayISO)
  const end = ymd(endOfMonth(t))
  if (p === 'year') return { from: ymd(startOfYear(t)), to: end }
  const n = p === 'm3' ? 2 : p === 'm6' ? 5 : 11
  return { from: ymd(startOfMonth(subMonths(t, n))), to: end }
}

export function AnalyticsPage() {
  const { today, currency } = useGymToday()
  const [params, setParams] = useSearchParams()
  const preset: Preset = (params.get('range') ?? '') in presets ? (params.get('range') as Preset) : 'm6'
  const r = preset === 'custom'
    ? { from: params.get('from') ?? range('m6', today).from, to: params.get('to') ?? today }
    : range(preset, today)
  const [showTable, setShowTable] = useState(false)

  const { data, isPending, isError, error, isFetching } = useAnalytics(r.from, r.to)
  const overdue = useTopOverdue(10)
  const money = (v: number) => formatMoney(v, currency)

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  const months = data?.by_month ?? []
  const avg = months.length ? (data?.total ?? 0) / months.length : 0
  const best = months.reduce<(typeof months)[number] | null>((b, m) => (!b || m.total > b.total ? m : b), null)
  const onTimeTotal = (data?.on_time ?? 0) + (data?.late ?? 0)
  const onTimePct = onTimeTotal ? Math.round(((data?.on_time ?? 0) / onTimeTotal) * 100) : null

  const exportMonthly = () => downloadCsv(`revenue_${r.from}_to_${r.to}.csv`, toCsv(
    ['Month', 'Total', 'Membership fees', 'Other fees', 'Payments', 'New members'],
    months.map((m) => [format(parseISO(m.month), 'yyyy-MM'), m.total, m.membership, m.other, m.payments, m.new_members]),
  ))
  const exportOverdue = () => downloadCsv(`overdue_${today}.csv`, toCsv(
    ['Member #', 'Name', 'Phone', 'Due since', 'Days late', 'Months owed', 'Amount due'],
    (overdue.data ?? []).map((o) => [o.member_code, o.full_name, formatPhone(o.phone), o.next_due_date, o.days_overdue, o.cycles, o.amount_due]),
  ))

  return (
    <>
      <PageHeader title="Analytics" description={`${formatDate(r.from)} – ${formatDate(r.to)}`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Date range">
          {(Object.keys(presets) as Preset[]).map((p) => (
            <button key={p} role="tab" aria-selected={preset === p}
              onClick={() => set(p === 'custom' ? { range: p, from: r.from, to: r.to } : { range: p === 'm6' ? null : p, from: null, to: null })}
              className={cn('h-8 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors',
                preset === p ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground')}>
              {presets[p]}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex gap-2">
            <Input type="date" aria-label="From" value={r.from} max={r.to} onChange={(e) => e.target.value && set({ from: e.target.value })} className="h-9 w-auto bg-background" />
            <Input type="date" aria-label="To" value={r.to} min={r.from} onChange={(e) => e.target.value && set({ to: e.target.value })} className="h-9 w-auto bg-background" />
          </div>
        )}
      </div>

      {isError ? <EmptyState icon={BarChart3} title="Could not load analytics" description={error.message} /> : (
        <div className={cn('space-y-4 transition-opacity', isFetching && !isPending && 'opacity-70')}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiTile icon={TrendingUp} label="Total revenue" loading={isPending} value={data && money(data.total)}
              sub={data && <span>{data.payments} payments</span>} />
            <KpiTile icon={Receipt} label="Average per month" loading={isPending} value={money(Math.round(avg))}
              sub={best && best.total > 0 && <span>Best: {format(parseISO(best.month), 'MMM yyyy')}</span>} />
            <KpiTile icon={Users} label="Members who paid" loading={isPending} value={data?.members_paid}
              sub={<span>{months.reduce((s, m) => s + m.new_members, 0)} new joined</span>} />
            <KpiTile icon={CalendarCheck} label="Paid by due date" loading={isPending} value={onTimePct === null ? '—' : `${onTimePct}%`}
              sub={onTimeTotal ? <span>{data?.late} of {onTimeTotal} paid after the due date</span> : <span>No membership fees</span>} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by month</CardTitle>
              <CardDescription>All fees received, by the date they were paid</CardDescription>
              <CardAction className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}><Table2 /> {showTable ? 'Chart' : 'Table'}</Button>
                <Button variant="ghost" size="sm" onClick={exportMonthly} disabled={!months.length}><Download /> CSV</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {isPending ? <Skeleton className="h-64 w-full" /> : showTable ? (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Month</TableHead><TableHead className="text-right">Membership</TableHead><TableHead className="text-right">Other</TableHead>
                    <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Payments</TableHead><TableHead className="text-right">New members</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {months.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell>{format(parseISO(m.month), 'MMM yyyy')}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(m.membership)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(m.other)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{money(m.total)}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.payments}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.new_members}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <MonthlyBarChart label="Revenue per month" money currency={currency} height={280}
                  data={months.map((m) => ({ month: m.month, value: m.total, detail: `${m.payments} payments · ${money(m.other)} other fees` }))} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>By payment method</CardTitle></CardHeader>
              <CardContent>
                {isPending ? <Skeleton className="h-40 w-full" /> : (
                  <RankedBars currency={currency} rows={(data?.by_method ?? []).map((x) => ({ label: methodLabels[x.method], value: x.total, sub: `${x.payments} payments` }))} />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Membership fees by plan</CardTitle></CardHeader>
              <CardContent>
                {isPending ? <Skeleton className="h-40 w-full" /> : (
                  <RankedBars currency={currency} rows={(data?.by_plan ?? []).map((x) => ({ label: x.plan, value: x.total, sub: `${x.payments} payments` }))} />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>By fee type</CardTitle></CardHeader>
              <CardContent>
                {isPending ? <Skeleton className="h-40 w-full" /> : (
                  <RankedBars currency={currency} rows={(data?.by_type ?? []).map((x) => ({ label: typeLabels[x.type], value: x.total, sub: `${x.payments} payments` }))} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>New members per month</CardTitle>
            </CardHeader>
            <CardContent>
              {isPending ? <Skeleton className="h-48 w-full" /> : (
                <MonthlyBarChart label="New members per month" height={200}
                  data={months.map((m) => ({ month: m.month, value: m.new_members }))} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top overdue members</CardTitle>
              <CardDescription>Right now, ranked by amount owed (months missed × fee)</CardDescription>
              <CardAction><Button variant="ghost" size="sm" onClick={exportOverdue} disabled={!overdue.data?.length}><Download /> CSV</Button></CardAction>
            </CardHeader>
            <CardContent>
              {overdue.isPending ? <Skeleton className="h-40 w-full" /> : !overdue.data?.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nobody is overdue 🎉</p>
              ) : (
                <div className="-mx-4 overflow-x-auto sm:mx-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="pl-4 sm:pl-2">Member</TableHead><TableHead>Phone</TableHead><TableHead>Due since</TableHead>
                      <TableHead className="text-right">Days late</TableHead><TableHead className="pr-4 text-right sm:pr-2">Owes</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {overdue.data.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="pl-4 sm:pl-2">
                            <Link to={`/members/${o.id}`} className="flex items-center gap-2 hover:underline">
                              <MemberAvatar name={o.full_name} photoId={o.photo_public_id} size={28} /> {o.full_name}
                            </Link>
                          </TableCell>
                          <TableCell className="tabular-nums">{formatPhone(o.phone)}</TableCell>
                          <TableCell>{formatDate(o.next_due_date)}</TableCell>
                          <TableCell className="text-right tabular-nums">{o.days_overdue}</TableCell>
                          <TableCell className="pr-4 text-right font-semibold tabular-nums sm:pr-2">{money(o.amount_due)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
