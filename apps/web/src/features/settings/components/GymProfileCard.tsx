import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { FormField } from '@/components/shared/FormField'
import { normalizePhone } from '@/features/members/utils'
import { useSettings, useUpdateSettings } from '../hooks'

const schema = z.object({
  gym_name: z.string().trim().min(2, 'Enter the gym name').max(80),
  gym_phone: z.string().trim().refine((v) => v === '' || normalizePhone(v) !== null, 'Enter a valid number'),
  currency: z.string().trim().min(2).max(5).toUpperCase(),
  timezone: z.string().min(1),
})
type Values = z.infer<typeof schema>

export function GymProfileCard() {
  const { data: s } = useSettings()
  const save = useUpdateSettings()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { gym_name: '', gym_phone: '', currency: 'PKR', timezone: 'Asia/Karachi' } })
  const { errors, isDirty } = form.formState
  const zones = useMemo(() => Intl.supportedValuesOf('timeZone'), [])

  useEffect(() => {
    if (s) form.reset({ gym_name: s.gym_name, gym_phone: s.gym_phone ?? '', currency: s.currency, timezone: s.timezone })
  }, [s, form])

  const onSubmit = form.handleSubmit((v) => save.mutate({ ...v, gym_phone: v.gym_phone ? normalizePhone(v.gym_phone) : null }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gym profile</CardTitle>
        <CardDescription>Shown in the app and used in WhatsApp messages.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="gym_name" label="Gym name" error={errors.gym_name?.message} required>
            <Input id="gym_name" className="h-10" {...form.register('gym_name')} />
          </FormField>
          <FormField id="gym_phone" label="Gym phone" error={errors.gym_phone?.message}>
            <Input id="gym_phone" type="tel" className="h-10" {...form.register('gym_phone')} />
          </FormField>
          <FormField id="currency" label="Currency" hint="e.g. PKR, INR, USD">
            <Input id="currency" className="h-10 uppercase" maxLength={5} {...form.register('currency')} />
          </FormField>
          <FormField id="timezone" label="Timezone" hint="Decides what “today” means for due dates">
            <NativeSelect id="timezone" className="w-full [&_select]:h-10" {...form.register('timezone')}>
              {zones.map((z) => <NativeSelectOption key={z} value={z}>{z}</NativeSelectOption>)}
            </NativeSelect>
          </FormField>
        </CardContent>
        <CardFooter className="mt-4 justify-end">
          <Button type="submit" disabled={!isDirty || save.isPending}>{save.isPending && <Loader2 className="animate-spin" />} Save</Button>
        </CardFooter>
      </form>
    </Card>
  )
}
