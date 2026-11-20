import { endOfMonth, endOfYear, format, parseISO, startOfMonth, startOfYear, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Loader2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { MemberAvatar } from '@/features/members/components/MemberAvatar'
import { useGymToday } from '@/features/members/hooks'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { exportPayments, PAYMENTS_PAGE_SIZE, type PaymentFilters } from '../api'
import { usePayments, usePaymentTotals } from '../hooks'
import { methodLabels, paymentMethods, paymentTypes, typeLabels, type PaymentMethod, type PaymentType } from '../schema'

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
const presets = {
  this_month: 'This month',
  last_month: 'Last month',
  last_3: 'Last 3 months',
  this_year: 'This year',
  custom: 'Custom',
} as const
type Preset = keyof typeof presets

function presetRange(p: Exclude<Preset, 'custom'>, todayISO: string) {
  const t = parseISO(todayISO)
  switch (p) {
    case 'this_month': return { from: ymd(startOfMonth(t)), to: ymd(endOfMonth(t)) }
    case 'last_month': { const l = subMonths(t, 1); return { from: ymd(startOfMonth(l)), to: ymd(endOfMonth(l)) } }
    case 'last_3': return { from: ymd(startOfMonth(subMonths(t, 2))), to: ymd(endOfMonth(t)) }
    case 'this_year': return { from: ymd(startOfYear(t)), to: ymd(endOfYear(t)) }
  }
}

export function PaymentsPage() {
  const { today, currency } = useGymToday()
  const [params, setParams] = useSearchParams()
  const preset = (params.get('range') as Preset) in presets ? (params.get('range') as Preset) : 'this_month'
  const range = preset === 'custom'
    ? { from: params.get('from') ?? presetRange('this_month', today).from, to: params.get('to') ?? today }
    : presetRange(preset, today)
  const filters: PaymentFilters = {
    ...range,
    method: (params.get('method') as PaymentMethod) ?? 'all',
    type: (params.get('type') as PaymentType) ?? 'all',
  }
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0)
  const [exporting, setExporting] = useState(false)

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'all') next.delete(k)
      else next.set(k, v)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  const list = usePayments(filters, page)
  const totals = usePaymentTotals(filters)
  const payments = list.data?.payments ?? []
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAYMENTS_PAGE_SIZE))

  const onExport = async () => {
    setExporting(true)
    try {
      const rows = await exportPayments(filters)
      const csv = toCsv(
        ['Date paid', 'Member #', 'Member', 'Amount', 'Type', 'Method', 'Period start', 'Period end', 'Note'],
        rows.map((p) => [p.paid_on, p.member?.member_code, p.member?.full_name, p.amount, typeLabels[p.type], methodLabels[p.method], p.period_start, p.period_end, p.note]),
      )
      downloadCsv(`payments_${filters.from}_to_${filters.to}.csv`, csv)
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader title="Payments" description={`${formatDate(filters.from)} – ${formatDate(filters.to)}`}
        actions={<Button variant="outline" className="h-10" onClick={onExport} disabled={exporting || !payments.length}>
          {exporting ? <Loader2 className="animate-spin" /> : <Download />} Export CSV
        </Button>} />

      <div className="mb-4 space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Date range">
          {(Object.keys(presets) as Preset[]).map((p) => (
            <button key={p} role="tab" aria-selected={preset === p}
              onClick={() => set(p === 'custom' ? { range: p, from: range.from, to: range.to } : { range: p === 'this_month' ? null : p, from: null, to: null })}
              className={cn('h-8 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors',
                preset === p ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground')}>
              {presets[p]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {preset === 'custom' && (
            <>
              <Input type="date" aria-label="From" value={filters.from} max={filters.to} onChange={(e) => e.target.value && set({ from: e.target.value })} className="h-10 w-auto bg-background" />
              <Input type="date" aria-label="To" value={filters.to} min={filters.from} onChange={(e) => e.target.value && set({ to: e.target.value })} className="h-10 w-auto bg-background" />
            </>
          )}
          <NativeSelect aria-label="Method" value={filters.method} onChange={(e) => set({ method: e.target.value })} className="[&_select]:h-10 [&_select]:bg-background">
            <NativeSelectOption value="all">All methods</NativeSelectOption>
            {paymentMethods.map((m) => <NativeSelectOption key={m} value={m}>{methodLabels[m]}</NativeSelectOption>)}
          </NativeSelect>
          <NativeSelect aria-label="Type" value={filters.type} onChange={(e) => set({ type: e.target.value })} className="[&_select]:h-10 [&_select]:bg-background">
            <NativeSelectOption value="all">All types</NativeSelectOption>
            {paymentTypes.map((t) => <NativeSelectOption key={t} value={t}>{typeLabels[t]}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card size="sm" className="sm:col-span-1"><CardContent>
          <p className="text-xs text-muted-foreground">Total received</p>
          {totals.isPending ? <Skeleton className="mt-1 h-8 w-32" /> : (
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(totals.data?.total ?? 0, currency)}</p>
          )}
          <p className="text-xs text-muted-foreground">{totals.data?.count ?? 0} payments</p>
        </CardContent></Card>
        <Card size="sm" className="sm:col-span-2"><CardContent>
          <p className="mb-2 text-xs text-muted-foreground">By method</p>
          {totals.isPending ? <Skeleton className="h-8 w-full" /> : totals.data?.byMethod.length ? (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {totals.data.byMethod.map(([m, amt]) => (
                <div key={m}>
                  <div className="text-xs text-muted-foreground">{methodLabels[m]}</div>
                  <div className="font-semibold tabular-nums">{formatMoney(amt, currency)}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">—</p>}
        </CardContent></Card>
      </div>

      {list.isError ? (
        <EmptyState icon={Wallet} title="Could not load payments" description={list.error.message} />
      ) : list.isPending ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : payments.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments in this period" description="Try a wider date range, or record a payment from a member's profile." />
      ) : (
        <div className={cn('transition-opacity', list.isFetching && 'opacity-70')}>
          <ul className="divide-y rounded-xl border bg-background md:hidden">
            {payments.map((p) => (
              <li key={p.id}>
                <Link to={p.member ? `/members/${p.member.id}` : '#'} className="flex items-center gap-3 p-3 active:bg-muted">
                  <MemberAvatar name={p.member?.full_name ?? '?'} photoId={p.member?.photo_public_id ?? null} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.member?.full_name ?? 'Deleted member'}</div>
                    <div className="truncate text-xs text-muted-foreground">{formatDate(p.paid_on)} · {methodLabels[p.method]}{p.type !== 'membership' && ` · ${typeLabels[p.type]}`}</div>
                  </div>
                  <div className="font-semibold tabular-nums">{formatMoney(p.amount, currency)}</div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-xl border bg-background md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Date</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>For</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="pr-4 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-4 tabular-nums">{formatDate(p.paid_on)}</TableCell>
                    <TableCell>
                      {p.member ? (
                        <Link to={`/members/${p.member.id}`} className="flex items-center gap-2 hover:underline">
                          <MemberAvatar name={p.member.full_name} photoId={p.member.photo_public_id} size={28} />
                          {p.member.full_name}
                        </Link>
                      ) : <span className="text-muted-foreground">Deleted member</span>}
                    </TableCell>
                    <TableCell>{typeLabels[p.type]}</TableCell>
                    <TableCell><Badge variant="secondary">{methodLabels[p.method]}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {p.period_start && p.period_end ? `${formatDate(p.period_start)} – ${formatDate(p.period_end)}` : '—'}
                    </TableCell>
                    <TableCell className="pr-4 text-right font-semibold tabular-nums">{formatMoney(p.amount, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => set({ page: String(page - 1) })}><ChevronLeft /> Prev</Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => set({ page: String(page + 1) })}>Next <ChevronRight /></Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
