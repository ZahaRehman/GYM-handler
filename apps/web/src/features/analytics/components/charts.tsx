import { format, parseISO } from 'date-fns'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '@/lib/format'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

type Datum = { month: string; value: number; detail?: string }

function ChartTooltip({ active, datum, valueFormat }: { active?: boolean; datum?: Datum; valueFormat: (v: number) => string }) {
  if (!active || !datum) return null
  const d = datum
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="text-xs text-muted-foreground">{format(parseISO(d.month), 'MMMM yyyy')}</div>
      <div className="font-semibold tabular-nums">{valueFormat(d.value)}</div>
      {d.detail && <div className="text-xs text-muted-foreground">{d.detail}</div>}
    </div>
  )
}

/** Single-series monthly bar chart (one hue, thin bars, rounded data end, recessive grid). */
export function MonthlyBarChart({ data, money, currency = 'PKR', height = 240, highlightMonth, label }: {
  data: Datum[]
  money?: boolean
  currency?: string
  height?: number
  highlightMonth?: string
  label: string
}) {
  const fmt = (v: number) => (money ? formatMoney(v, currency) : String(v))
  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} style={{ stroke: 'var(--viz-grid)' }} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--viz-axis)', fontSize: 12 }}
            tickFormatter={(m: string) => format(parseISO(m), data.length > 8 ? 'MMM' : 'MMM yy')} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: 'var(--viz-axis)', fontSize: 12 }}
            tickFormatter={(v: number) => compact.format(v)} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.6 }} content={(p) => <ChartTooltip active={p.active} datum={p.payload?.[0]?.payload as Datum | undefined} valueFormat={fmt} />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}
            shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: Datum }) => {
              const { x = 0, y = 0, width = 0, height: h = 0, payload } = props
              const dim = highlightMonth && payload?.month !== highlightMonth
              const r = Math.min(4, width / 2, h)
              return (
                <path style={{ fill: 'var(--viz-1)', opacity: dim ? 0.45 : 1 }}
                  d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + h} Z`} />
              )
            }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Ranked horizontal bars in plain HTML: label, value as text, bar for magnitude. */
export function RankedBars({ rows, currency, empty = 'No data' }: {
  rows: { label: string; value: number; sub?: string }[]
  currency: string
  empty?: string
}) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  const max = Math.max(...rows.map((r) => r.value), 1)
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatMoney(r.value, currency)} <span className="text-xs font-normal text-muted-foreground">{total ? Math.round((r.value / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted" title={r.sub}>
            <div className="h-2 rounded-full bg-[var(--viz-1)]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
