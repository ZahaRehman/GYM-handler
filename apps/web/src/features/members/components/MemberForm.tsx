import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useBlocker } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ChoiceChips } from '@/components/shared/ChoiceChips'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormField } from '@/components/shared/FormField'
import { usePlans } from '@/features/plans/hooks'
import { durationLabel } from '@/features/plans/schema'
import { addMonthsISO } from '@/lib/dates'
import { formatDate, formatMoney } from '@/lib/format'
import { methodLabels, paymentMethods } from '@/features/payments/schema'
import { memberFormSchema, type MemberFormValues } from '../schema'
import { PhotoUpload } from './PhotoUpload'

const field = 'h-10'
const select = 'w-full [&_select]:h-10'

export function MemberForm({ defaultValues, isNew, submitting, currency, onSubmit, onCancel }: {
  defaultValues: MemberFormValues
  isNew: boolean
  submitting: boolean
  currency: string
  onSubmit: (values: MemberFormValues) => void
  onCancel: () => void
}) {
  const { data: plans = [] } = usePlans()
  const form = useForm<MemberFormValues>({ resolver: zodResolver(memberFormSchema), defaultValues })
  const { errors, isDirty, dirtyFields, isSubmitSuccessful } = form.formState
  const { register, setValue, control } = form

  const [planId, joinDate, fee, fullName, collect, admission] = useWatch({ control, name: ['plan_id', 'join_date', 'fee_amount', 'full_name', 'collect_payment', 'admission_fee'] })
  const plan = plans.find((p) => p.id === planId)
  const selectablePlans = plans.filter((p) => p.is_active || p.id === defaultValues.plan_id)

  // Plan changed: prefill the fee.
  useEffect(() => {
    if (plan && dirtyFields.plan_id && !dirtyFields.fee_amount) setValue('fee_amount', plan.price, { shouldValidate: true })
  }, [plan, dirtyFields.plan_id, dirtyFields.fee_amount, setValue])

  // New member not paying now: due on the join date unless changed by hand.
  useEffect(() => {
    if (isNew && !dirtyFields.next_due_date && joinDate) setValue('next_due_date', joinDate, { shouldValidate: true })
  }, [isNew, joinDate, dirtyFields.next_due_date, setValue])

  const dueAfterPayment = plan && joinDate ? addMonthsISO(joinDate, plan.duration_months) : null
  const feeOk = typeof fee === 'number' && !Number.isNaN(fee)
  const firstTotal = (feeOk ? fee : 0) + (typeof admission === 'number' && !Number.isNaN(admission) ? admission : 0)

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isDirty && !isSubmitSuccessful && !submitting && currentLocation.pathname !== nextLocation.pathname)

  const discount = plan && typeof fee === 'number' && !Number.isNaN(fee) && fee < plan.price ? plan.price - fee : 0

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6 pb-20">
      <Card>
        <CardHeader><CardTitle>Photo</CardTitle></CardHeader>
        <CardContent>
          <Controller control={control} name="photo_public_id" render={({ field: f }) => (
            <PhotoUpload value={f.value} onChange={(v) => f.onChange(v)} name={fullName ?? ''} />
          )} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField id="full_name" label="Full name" error={errors.full_name?.message} required>
              <Input id="full_name" className={field} autoComplete="off" autoFocus={isNew} {...register('full_name')} aria-invalid={!!errors.full_name} />
            </FormField>
          </div>
          <FormField id="phone" label="WhatsApp number" error={errors.phone?.message} hint="e.g. 0300 1234567" required>
            <Input id="phone" type="tel" inputMode="tel" className={field} {...register('phone')} aria-invalid={!!errors.phone} />
          </FormField>
          <FormField id="gender" label="Gender">
            <NativeSelect id="gender" className={select} {...register('gender')}>
              <NativeSelectOption value="">Not specified</NativeSelectOption>
              <NativeSelectOption value="male">Male</NativeSelectOption>
              <NativeSelectOption value="female">Female</NativeSelectOption>
              <NativeSelectOption value="other">Other</NativeSelectOption>
            </NativeSelect>
          </FormField>
          <FormField id="date_of_birth" label="Date of birth" error={errors.date_of_birth?.message}>
            <Input id="date_of_birth" type="date" className={field} {...register('date_of_birth')} />
          </FormField>
          <FormField id="cnic" label="CNIC / ID number">
            <Input id="cnic" className={field} inputMode="numeric" placeholder="optional" {...register('cnic')} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="address" label="Address">
              <Input id="address" className={field} {...register('address')} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Emergency contact</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="emergency_contact_name" label="Name">
            <Input id="emergency_contact_name" className={field} {...register('emergency_contact_name')} />
          </FormField>
          <FormField id="emergency_contact_phone" label="Phone" error={errors.emergency_contact_phone?.message}>
            <Input id="emergency_contact_phone" type="tel" inputMode="tel" className={field} {...register('emergency_contact_phone')} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership & fee</CardTitle>
          <CardDescription>The plan sets the default fee. Change the fee for discounts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="plan_id" label="Plan" error={errors.plan_id?.message} required>
            <NativeSelect id="plan_id" className={select} {...register('plan_id')} aria-invalid={!!errors.plan_id}>
              <NativeSelectOption value="">Choose a plan…</NativeSelectOption>
              {selectablePlans.map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>
                  {p.name} — {formatMoney(p.price, currency)} / {durationLabel(p.duration_months)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="fee_amount" label={`Fee (${currency})`} error={errors.fee_amount?.message} required
            hint={discount ? `Discount of ${formatMoney(discount, currency)} on ${plan?.name}` : plan ? `Per ${durationLabel(plan.duration_months)}` : undefined}>
            <Input id="fee_amount" type="number" inputMode="decimal" min={0} className={field} {...register('fee_amount', { valueAsNumber: true })} aria-invalid={!!errors.fee_amount} />
          </FormField>
          <FormField id="join_date" label="Join date" error={errors.join_date?.message} required>
            <Input id="join_date" type="date" className={field} {...register('join_date')} />
          </FormField>
          {!(isNew && collect) && (
            <FormField id="next_due_date" label={isNew ? 'First due date' : 'Next due date'} error={errors.next_due_date?.message} required
              hint={isNew ? 'When the first fee should be paid.' : 'Normally moved forward by recording a payment.'}>
              <Input id="next_due_date" type="date" className={field} {...register('next_due_date')} aria-invalid={!!errors.next_due_date} />
            </FormField>
          )}
        </CardContent>
      </Card>

      {isNew && (
        <Card>
          <CardHeader>
            <CardTitle>First payment</CardTitle>
            <CardDescription>Most members pay when they join.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller control={control} name="collect_payment" render={({ field: f }) => (
              <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <span>
                  <span className="block text-sm font-medium">Collect first fee now</span>
                  <span className="block text-xs text-muted-foreground">Records the payment and sets the next due date</span>
                </span>
                <Switch checked={f.value} onCheckedChange={f.onChange} />
              </label>
            )} />
            {collect && (
              <>
                <FormField id="payment_method" label="Paid by">
                  <Controller control={control} name="payment_method" render={({ field: f }) => (
                    <ChoiceChips id="payment_method" label="Payment method" value={f.value} onChange={f.onChange}
                      options={paymentMethods.map((m) => ({ value: m, label: methodLabels[m] }))} />
                  )} />
                </FormField>
                <FormField id="admission_fee" label={`Admission fee (${currency})`} error={errors.admission_fee?.message} hint="Optional, one-time">
                  <Input id="admission_fee" type="number" inputMode="decimal" min={0} placeholder="0" className={`${field} max-w-48`}
                    {...register('admission_fee', { valueAsNumber: true })} />
                </FormField>
                <div className="rounded-lg bg-primary/10 p-3 text-sm">
                  Collect <b>{formatMoney(firstTotal, currency)}</b> now.
                  {dueAfterPayment && <> Next due date: <b>{formatDate(dueAfterPayment)}</b>.</>}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea id="notes" rows={3} placeholder="Injuries, goals, trainer, anything useful…" aria-label="Notes" {...register('notes')} />
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t bg-background/95 p-3 backdrop-blur md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-6xl justify-end gap-2 md:px-3">
          <Button type="button" variant="outline" className="h-10" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="h-10 min-w-32" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />} {isNew ? 'Save member' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog open={blocker.state === 'blocked'} onOpenChange={(o) => !o && blocker.reset?.()}
        title="Discard changes?" description="You have unsaved changes on this member." confirmLabel="Discard" destructive
        onConfirm={() => blocker.proceed?.()} />
    </form>
  )
}
