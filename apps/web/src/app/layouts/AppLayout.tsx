import { Dumbbell, LogOut, Settings } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAdminProfile, useSignOut } from '@/features/auth/hooks'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePendingReminderCount } from '@/features/reminders/hooks'
import { useSettings } from '@/features/settings/hooks'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import { navItems } from '../navigation'

function GymBrand() {
  const { data: settings } = useSettings()
  return (
    <div className="flex items-center gap-2 font-semibold">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Dumbbell className="size-4" />
      </div>
      <span className="truncate">{settings?.gym_name ?? 'Gym Admin'}</span>
    </div>
  )
}

function UserMenu() {
  const { session } = useAuth()
  const { data: admin } = useAdminProfile()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const name = admin?.full_name || session?.user.email || 'Admin'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Account menu">
        <Avatar>
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="truncate text-sm font-medium text-foreground">{name}</div>
            <div className="truncate text-xs">{session?.user.email}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => signOut.mutate()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CountBadge({ count, className }: { count: number | undefined; className?: string }) {
  if (!count) return null
  return (
    <span className={cn('inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] leading-5 font-semibold text-white tabular-nums', className)}
      aria-label={`${count} reminders to send`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function AppLayout() {
  const { data: pending } = usePendingReminderCount()
  return (
    <div className="min-h-svh bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center px-5">
          <GymBrand />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Main">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
              )}>
              <Icon className="size-4" />
              {label}
              {to === '/dues' && <CountBadge count={pending} className="ml-auto" />}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:h-16 md:px-6">
          <div className="md:hidden"><GymBrand /></div>
          <div className="hidden md:block" />
          <UserMenu />
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-24 md:px-6 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        {navItems.filter((i) => i.mobile).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => cn(
              'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground',
              isActive && 'text-primary',
            )}>
            <span className="relative">
              <Icon className="size-5" />
              {to === '/dues' && <CountBadge count={pending} className="absolute -top-2 -right-3" />}
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
