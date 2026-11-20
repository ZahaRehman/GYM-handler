import { cn } from '@/lib/utils'

/** Single-choice chips; large touch targets for the front desk. */
export function ChoiceChips<T extends string | number>({ value, onChange, options, label, id }: {
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: string }[]
  label: string
  id?: string
}) {
  return (
    <div id={id} role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn('h-9 min-w-11 rounded-lg border px-3 text-sm font-medium transition-colors',
            value === o.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
