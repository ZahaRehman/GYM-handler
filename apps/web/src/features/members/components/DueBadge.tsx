import { cn } from '@/lib/utils'
import type { DueInfo, DueStatus } from '../utils'

const styles: Record<DueStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  due_soon: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  due_today: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  paused: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  left: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

export function DueBadge({ info, className }: { info: DueInfo; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap', styles[info.status], className)}>
      {info.label}
    </span>
  )
}
