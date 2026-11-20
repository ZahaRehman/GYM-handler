import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FormField } from '@/components/shared/FormField'
import { useSavePlan } from '../hooks'
import { planFormSchema, type Plan, type PlanFormValues } from '../schema'

const empty: PlanFormValues = { name: '', duration_months: 1, price: 0, is_active: true }

export function PlanDialog({ open, onOpenChange, plan }: { open: boolean; onOpenChange: (o: boolean) => void; plan?: Plan | null }) {
  const save = useSavePlan()
  const form = useForm<PlanFormValues>({ resolver: zodResolver(planFormSchema), defaultValues: empty })
  const { errors } = form.formState

  useEffect(() => {
    if (open) {
      form.reset(plan ? { name: plan.name, duration_months: plan.duration_months, price: plan.price, is_active: plan.is_active } : empty)
    }
  }, [open, plan, form])

  const onSubmit = form.handleSubmit((values) =>
    save.mutate({ id: plan?.id, values }, { onSuccess: () => onOpenChange(false) }),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit plan' : 'Add plan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField id="plan-name" label="Name" error={errors.name?.message} required>
            <Input id="plan-name" placeholder="e.g. Monthly" autoFocus {...form.register('name')} aria-invalid={!!errors.name} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="plan-duration" label="Duration (months)" error={errors.duration_months?.message} required>
              <Input id="plan-duration" type="number" inputMode="numeric" min={1} {...form.register('duration_months', { valueAsNumber: true })} aria-invalid={!!errors.duration_months} />
            </FormField>
            <FormField id="plan-price" label="Price" error={errors.price?.message} required>
              <Input id="plan-price" type="number" inputMode="decimal" min={0} {...form.register('price', { valueAsNumber: true })} aria-invalid={!!errors.price} />
            </FormField>
          </div>
          <Controller control={form.control} name="is_active" render={({ field }) => (
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span>
                <span className="block text-sm font-medium">Active</span>
                <span className="block text-xs text-muted-foreground">Inactive plans are hidden when adding members</span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />} Save plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
