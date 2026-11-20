import { Loader2, RotateCcw } from 'lucide-react'
import { useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { SAMPLE_MEMBER, renderMemberMessage } from '@/features/reminders/message'
import { formatDate } from '@/lib/format'
import { renderTemplate } from '@/lib/template'
import { useSettings, useUpdateSettings } from '../hooks'

type Key = 'template_before_due' | 'template_on_due' | 'template_overdue' | 'template_receipt'
const tabs: { key: Key; label: string }[] = [
  { key: 'template_before_due', label: 'Before due' },
  { key: 'template_on_due', label: 'Due today' },
  { key: 'template_overdue', label: 'Overdue' },
  { key: 'template_receipt', label: 'Receipt' },
]
const defaults: Record<Key, string> = {
  template_before_due: 'Assalam o Alaikum {name}! Your {gym} fee of {currency} {amount} is due on {due_date}. Thank you!',
  template_on_due: 'Hi {name}, your {gym} fee of {currency} {amount} is due today ({due_date}).',
  template_overdue: 'Hi {name}, your {gym} fee of {currency} {amount} was due on {due_date}. Please clear it at your earliest.',
  template_receipt: 'Thank you {name}! Received {currency} {amount} on {paid_on}. Next due date: {due_date}. - {gym}',
}
const placeholders = ['{name}', '{gym}', '{currency}', '{amount}', '{due_date}', '{member_code}']

type Settings = Database['public']['Tables']['settings']['Row']

export function MessagesCard() {
  const { data: s } = useSettings()
  if (!s) return <Skeleton className="h-80 w-full rounded-xl" />
  return <MessagesForm key={s.updated_at} s={s} />
}

function MessagesForm({ s }: { s: Settings }) {
  const save = useUpdateSettings()
  const [values, setValues] = useState<Record<Key, string>>({
    template_before_due: s.template_before_due, template_on_due: s.template_on_due,
    template_overdue: s.template_overdue, template_receipt: s.template_receipt,
  })
  const [active, setActive] = useState<Key>('template_before_due')
  const ref = useRef<HTMLTextAreaElement>(null)

  const dirty = tabs.some((t) => s[t.key] !== values[t.key])
  const empty = tabs.some((t) => values[t.key].trim() === '')

  const insert = (token: string) => {
    const el = ref.current
    const cur = values[active]
    const start = el?.selectionStart ?? cur.length
    const end = el?.selectionEnd ?? cur.length
    setValues((v) => ({ ...v, [active]: cur.slice(0, start) + token + cur.slice(end) }))
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length) })
  }

  const preview = (key: Key) => {
    const settings = { gym_name: s.gym_name, currency: s.currency }
    const text = key === 'template_receipt'
      ? renderTemplate(values[key], { paid_on: formatDate('2026-11-19') }) // receipt-only placeholder first
      : values[key]
    return renderMemberMessage(text, SAMPLE_MEMBER, settings)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp messages</CardTitle>
        <CardDescription>Placeholders are replaced with each member's details. English, Roman Urdu or Urdu all work.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={active} onValueChange={(v) => setActive(v as Key)}>
          <TabsList className="mb-3 w-full justify-start overflow-x-auto sm:w-auto">
            {tabs.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.key} value={t.key} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Textarea ref={active === t.key ? ref : undefined} rows={5} aria-label={`${t.label} message`} value={values[t.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [t.key]: e.target.value }))} />
                <div className="flex flex-wrap gap-1.5">
                  {[...placeholders, ...(t.key === 'template_receipt' ? ['{paid_on}'] : [])].map((p) => (
                    <button key={p} type="button" onClick={() => insert(p)} className="rounded-md border bg-muted px-2 py-1 font-mono text-xs hover:bg-background">{p}</button>
                  ))}
                  <button type="button" onClick={() => setValues((v) => ({ ...v, [t.key]: defaults[t.key] }))}
                    className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <RotateCcw className="size-3" /> Default
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-[#e5ddd5] p-4 dark:bg-[#0b141a]" aria-label="Preview">
                <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm whitespace-pre-wrap text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
                  {preview(t.key)}
                </div>
                <p className="mt-2 text-center text-[11px] text-[#54656f] dark:text-[#8696a0]">Preview with a sample member</p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      <CardFooter className="mt-4 justify-end">
        <Button disabled={!dirty || empty || save.isPending} onClick={() => save.mutate(values)}>
          {save.isPending && <Loader2 className="animate-spin" />} Save messages
        </Button>
      </CardFooter>
    </Card>
  )
}
