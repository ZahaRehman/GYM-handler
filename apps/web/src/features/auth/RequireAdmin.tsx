import { ShieldAlert } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { FullPageSpinner } from '@/components/shared/FullPageSpinner'
import { useAuth } from './AuthProvider'
import { useAdminProfile, useSignOut } from './hooks'

export function RequireAdmin() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const admin = useAdminProfile()
  const signOut = useSignOut()

  if (loading || (session && admin.isPending)) return <FullPageSpinner />

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  if (admin.isError || !admin.data) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="size-10 text-destructive" />
        <div>
          <h1 className="text-lg font-semibold">No access</h1>
          <p className="text-sm text-muted-foreground">
            {admin.isError
              ? 'Could not verify your account. Check your connection and try again.'
              : `${session.user.email} is not an admin of this gym.`}
          </p>
        </div>
        <Button variant="outline" onClick={() => signOut.mutate()}>
          Sign out
        </Button>
      </div>
    )
  }

  return <Outlet />
}
