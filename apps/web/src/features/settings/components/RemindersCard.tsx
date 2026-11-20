import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { cn } from '@/lib/utils'
import { useSettings, useUpdateSettings } from '../hooks'

const dayOptions = [7, 5, 3, 2, 1, 0]
const dayLabel = (d: number) => (d === 0 ? 'On the due date' : `${d} day${d === 1 ? '' : 's'} before`)

type Settings = Database['public']['Tables']['settings']['Row']

export function RemindersCard() {
  const { data: s } = useSettings()
  if (!s) return <Skeleton className="h-64 w-full rounded-xl" />
  // key: start fresh from the saved values after every save
  return <RemindersForm key={s.updated_at} s={s} />
}

function RemindersForm({ s }: { s: Settings }) {
  const save = useUpdateSettings()
  const [days, setDays] = useState<number[]>(s.reminder_days_before)
  const [repeat, setRepeat] = useState(s.overdue_repeat_days)
  const [max, setMax] = useState(s.overdue_max_reminders)
  const [dueSoon, setDueSoon] = useState(s.upcoming_window_days)

  const toggle = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => b - a)))
  const valid = repeat >= 1 && repeat <= 30 && max >= 0 && max <= 10 && dueSoon >= 0 && dueSoon <= 14
  const dirty = (JSON.stringify([...s.reminder_days_before].sort()) !== JSON.stringify([...days].sort())
    || s.overdue_repeat_days !== repeat || s.overdue_max_reminders !== max || s.upcoming_window_days !== dueSoon)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminder rules</CardTitle>
        <CardDescription>The reminder list is prepared every day at 9:00 AM (Pakistan time).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium">Remind members</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Days before due date">
            {dayOptions.map((d) => (
              <button key={d} type="button" aria-pressed={days.includes(d)} onClick={() => toggle(d)}
                className={cn('h-9 rounded-lg border px-3 text-sm font-medium',
                  days.includes(d) ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
                {dayLabel(d)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="repeat" label="If unpaid, remind every" hint="days">
            <Input id="repeat" type="number" min={1} max={30} className="h-10" value={repeat} onChange={(e) => setRepeat(e.target.valueAsNumber)} />
          </FormField>
          <FormField id="max" label="Max overdue reminders" hint="0 = never remind after the due date">
            <Input id="max" type="number" min={0} max={10} className="h-10" value={max} onChange={(e) => setMax(e.target.valueAsNumber)} />
          </FormField>
          <FormField id="window" label="“Due soon” means within" hint="days (for the yellow badge)">
            <Input id="window" type="number" min={0} max={14} className="h-10" value={dueSoon} onChange={(e) => setDueSoon(e.target.valueAsNumber)} />
          </FormField>
        </div>
        {!valid && <p className="text-sm text-destructive">Check the numbers: repeat 1–30 days, max 0–10, due soon 0–14 days.</p>}
      </CardContent>
      <CardFooter className="mt-4 justify-end">
        <Button disabled={!dirty || !valid || save.isPending}
          onClick={() => save.mutate({ reminder_days_before: days, overdue_repeat_days: repeat, overdue_max_reminders: max, upcoming_window_days: dueSoon })}>
          {save.isPending && <Loader2 className="animate-spin" />} Save
        </Button>
      </CardFooter>
    </Card>
  )
}
