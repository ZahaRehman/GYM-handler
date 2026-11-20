import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarCheck, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ChoiceChips } from '@/components/shared/ChoiceChips'
import { FormField } from '@/components/shared/FormField'
import { MemberAvatar } from '@/features/members/components/MemberAvatar'
import { useGymToday } from '@/features/members/hooks'
import type { MemberWithPlan } from '@/features/members/schema'
import { useSettings } from '@/features/settings/hooks'
import { addMonthsISO } from '@/lib/dates'
import { formatDate, formatMoney } from '@/lib/format'
import { useRecordPayment } from '../hooks'
import { receiptLink } from '../receipt'
import { methodLabels, monthOptions, paymentMethods, paymentTypes, recordPaymentSchema, typeLabels, type RecordPaymentValues } from '../schema'

export function RecordPaymentDialog({ member, open, onOpenChange }: { member: MemberWithPlan; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { today, currency } = useGymToday()
  const { data: settings } = useSettings()
  const record = useRecordPayment()
  const duration = member.plan?.duration_months ?? 1
  const [amountTouched, setAmountTouched] = useState(false)

  const defaults: RecordPaymentValues = { type: 'membership', months: 1, amount: member.fee_amount, method: 'cash', paid_on: today, note: '' }
  const form = useForm<RecordPaymentValues>({ resolver: zodResolver(recordPaymentSchema), defaultValues: defaults })
  const { errors } = form.formState
  const [type, months] = useWatch({ control: form.control, name: ['type', 'months'] })
  const isMembership = type === 'membership'

  useEffect(() => {
    if (open) {
      form.reset(defaults)
      setAmountTouched(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Keep amount = fee × months until the user types their own amount.
  useEffect(() => {
    if (!amountTouched && isMembership) form.setValue('amount', member.fee_amount * months)
  }, [months, isMembership, amountTouched, member.fee_amount, form])

  const newDue = addMonthsISO(member.next_due_date, duration * months)

  const onSubmit = form.handleSubmit((values) =>
    record.mutate({ memberId: member.id, values }, {
      onSuccess: (p) => {
        onOpenChange(false)
        const nextDue = p.period_end ?? member.next_due_date
        toast.success(isMembership ? `Payment recorded. Next due ${formatDate(nextDue)}` : 'Payment recorded', {
          action: {
            label: 'Send receipt',
            onClick: () => window.open(receiptLink({
              template: settings?.template_receipt, gym: settings?.gym_name ?? '', currency, member,
              amount: p.amount, paidOn: p.paid_on, nextDue,
            }), '_blank', 'noopener'),
          },
          duration: 10000,
        })
      },
    }),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription className="flex items-center gap-3 pt-1">
            <MemberAvatar name={member.full_name} photoId={member.photo_public_id} size={36} />
            <span>
              <span className="block font-medium text-foreground">{member.full_name}</span>
              <span className="block text-xs">Currently due {formatDate(member.next_due_date)} · {formatMoney(member.fee_amount, currency)}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField id="pay-type" label="For">
            <Controller control={form.control} name="type" render={({ field }) => (
              <ChoiceChips id="pay-type" label="Payment for" value={field.value} onChange={(v) => {
                field.onChange(v)
                if (v !== 'membership') { setAmountTouched(true); form.setValue('amount', Number.NaN) }
                else { setAmountTouched(false) }
              }} options={paymentTypes.map((t) => ({ value: t, label: typeLabels[t] }))} />
            )} />
          </FormField>

          {isMembership && (
            <FormField id="pay-months" label={duration === 1 ? 'Months covered' : `Periods covered (${duration} months each)`}>
              <Controller control={form.control} name="months" render={({ field }) => (
                <ChoiceChips id="pay-months" label="Months covered" value={field.value} onChange={field.onChange}
                  options={monthOptions.map((n) => ({ value: n, label: String(n) }))} />
              )} />
            </FormField>
          )}

          <FormField id="pay-amount" label={`Amount (${currency})`} error={errors.amount?.message} required>
            <Input id="pay-amount" type="number" inputMode="decimal" min={0} className="h-11 text-lg font-semibold tabular-nums"
              {...form.register('amount', { valueAsNumber: true, onChange: () => setAmountTouched(true) })} aria-invalid={!!errors.amount} />
          </FormField>

          <FormField id="pay-method" label="Method">
            <Controller control={form.control} name="method" render={({ field }) => (
              <ChoiceChips id="pay-method" label="Payment method" value={field.value} onChange={field.onChange}
                options={paymentMethods.map((m) => ({ value: m, label: methodLabels[m] }))} />
            )} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField id="pay-date" label="Date paid" error={errors.paid_on?.message}>
              <Input id="pay-date" type="date" max={today} className="h-10" {...form.register('paid_on')} />
            </FormField>
            <FormField id="pay-note" label="Note">
              <Input id="pay-note" className="h-10" placeholder="optional" {...form.register('note')} />
            </FormField>
          </div>

          {isMembership && (
            <div className="flex items-start gap-3 rounded-lg bg-primary/10 p-3 text-sm">
              <CalendarCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <div>New due date: <b>{formatDate(newDue)}</b></div>
                <div className="text-xs text-muted-foreground">Covers {formatDate(member.next_due_date)} – {formatDate(newDue)}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="h-10 min-w-36" disabled={record.isPending}>
              {record.isPending && <Loader2 className="animate-spin" />} Save payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
