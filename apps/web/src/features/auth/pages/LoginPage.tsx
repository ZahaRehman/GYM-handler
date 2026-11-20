import { zodResolver } from '@hookform/resolvers/zod'
import { Dumbbell, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendPasswordReset } from '../api'
import { useAuth } from '../AuthProvider'
import { useSignIn } from '../hooks'

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'Password is at least 6 characters'),
})
type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { session } = useAuth()
  const location = useLocation()
  const signIn = useSignIn()
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (session) return <Navigate to={from} replace />

  const onSubmit = form.handleSubmit((values) =>
    signIn.mutate(values, {
      onError: (err) => toast.error(err.message === 'Invalid login credentials' ? 'Wrong email or password' : err.message),
    }),
  )

  const onForgot = async () => {
    const email = form.getValues('email')
    const ok = await form.trigger('email')
    if (!ok) return
    try {
      await sendPasswordReset(email)
      toast.success('If that email is registered, a reset link is on its way.')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const { errors } = form.formState

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="size-6" />
          </div>
          <CardTitle className="text-xl">Gym Admin</CardTitle>
          <CardDescription>Sign in to manage members and fees</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" inputMode="email" className="h-11"
                aria-invalid={!!errors.email} {...form.register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" onClick={onForgot} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="h-11 pr-11"
                  aria-invalid={!!errors.password} {...form.register('password')} />
                <button type="button" onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="h-11 w-full" disabled={signIn.isPending}>
              {signIn.isPending && <Loader2 className="animate-spin" />}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
