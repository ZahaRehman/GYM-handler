import { BarChart3, BellRing, LayoutDashboard, Settings, Users, Wallet, type LucideIcon } from 'lucide-react'

export type NavItem = { to: string; label: string; icon: LucideIcon; mobile: boolean }

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
  { to: '/members', label: 'Members', icon: Users, mobile: true },
  { to: '/dues', label: 'Dues', icon: BellRing, mobile: true },
  { to: '/payments', label: 'Payments', icon: Wallet, mobile: true },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, mobile: true },
  { to: '/settings', label: 'Settings', icon: Settings, mobile: false },
]
