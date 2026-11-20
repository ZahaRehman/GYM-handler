import { Undo2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, formatMoney } from '@/lib/format'
import { useMemberPayments, useUndoPayment } from '../hooks'
import { methodLabels, typeLabels, type Payment } from '../schema'

export function PaymentHistory({ memberId, currency, onRecord }: { memberId: string; currency: string; onRecord: () => void }) {
  const { data: payments, isPending } = useMemberPayments(memberId)
  const undo = useUndoPayment()
  const [toUndo, setToUndo] = useState<Payment | null>(null)

  if (isPending) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
  if (!payments?.length) {
    return <EmptyState icon={Wallet} title="No payments yet" description="Record the first fee to start the history." action={<Button onClick={onRecord}><Wallet /> Record payment</Button>} />
  }

  // Only the latest membership payment may be undone (the DB enforces this too).
  const latestMembershipId = payments
    .filter((p) => p.type === 'membership')
    .sort((a, b) => (b.period_end ?? '').localeCompare(a.period_end ?? '') || b.created_at.localeCompare(a.created_at))[0]?.id
  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">
        {payments.length} payment{payments.length === 1 ? '' : 's'} · {formatMoney(total, currency)} in total
      </p>
      <ol className="divide-y rounded-xl border bg-background">
        {payments.map((p) => {
          const canUndo = p.type !== 'membership' || p.id === latestMembershipId
          return (
            <li key={p.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatMoney(p.amount, currency)}</span>
                  <Badge variant="secondary">{methodLabels[p.method]}</Badge>
                  {p.type !== 'membership' && <Badge variant="outline">{typeLabels[p.type]}</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Paid {formatDate(p.paid_on)}
                  {p.period_start && p.period_end && <> · covers {formatDate(p.period_start)} – {formatDate(p.period_end)}</>}
                </div>
                {p.note && <div className="mt-1 text-xs">{p.note}</div>}
              </div>
              {canUndo && (
                <Button variant="ghost" size="sm" onClick={() => setToUndo(p)} aria-label={`Undo payment of ${formatMoney(p.amount, currency)}`}>
                  <Undo2 /> Undo
                </Button>
              )}
            </li>
          )
        })}
      </ol>

      <ConfirmDialog open={!!toUndo} onOpenChange={(o) => !o && setToUndo(null)} destructive confirmLabel="Undo payment"
        title="Undo this payment?"
        description={toUndo?.type === 'membership' && toUndo.period_start
          ? `The ${formatMoney(toUndo.amount, currency)} payment is deleted and the due date goes back to ${formatDate(toUndo.period_start)}.`
          : 'The payment is deleted. The due date is not affected.'}
        onConfirm={() => { if (toUndo) undo.mutate(toUndo.id); setToUndo(null) }} />
    </>
  )
}
