import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function KpiTile({ icon: Icon, label, value, sub, delta, deltaLabel, loading, tone }: {
  icon: LucideIcon
  label: string
  value: ReactNode
  sub?: ReactNode
  delta?: number | null
  deltaLabel?: string
  loading?: boolean
  tone?: 'danger'
}) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon className="size-3.5" /> {label}</p>
        {loading ? <Skeleton className="mt-2 h-7 w-28" /> : (
          <p className={cn('mt-1 text-xl font-semibold tabular-nums sm:text-2xl', tone === 'danger' && 'text-red-600 dark:text-red-400')}>{value}</p>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {delta !== undefined && delta !== null && !loading && (
            <span className={cn('inline-flex items-center font-medium', delta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
              {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {delta >= 0 ? '+' : ''}{delta}% {deltaLabel}
            </span>
          )}
          {sub}
        </div>
      </CardContent>
    </Card>
  )
}
