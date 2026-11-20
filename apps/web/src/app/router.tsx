import { createBrowserRouter } from 'react-router'
import { FullPageSpinner } from '@/components/shared/FullPageSpinner'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RequireAdmin } from '@/features/auth/RequireAdmin'
import { AppLayout } from './layouts/AppLayout'
import { NotFound } from './NotFound'
import { RouteError } from './RouteError'

// Each page is its own file, downloaded the first time it is opened.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteError /> },
  {
    element: <RequireAdmin />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <FullPageSpinner />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            errorElement: <RouteError />,
            children: [
              { index: true, lazy: async () => ({ Component: (await import('@/features/dashboard/DashboardPage')).DashboardPage }) },
              { path: 'members', lazy: async () => ({ Component: (await import('@/features/members/pages/MembersPage')).MembersPage }) },
              { path: 'members/import', lazy: async () => ({ Component: (await import('@/features/data/pages/ImportMembersPage')).ImportMembersPage }) },
              { path: 'members/new', lazy: async () => ({ Component: (await import('@/features/members/pages/MemberFormPage')).MemberFormPage }) },
              { path: 'members/:id', lazy: async () => ({ Component: (await import('@/features/members/pages/MemberDetailPage')).MemberDetailPage }) },
              { path: 'members/:id/edit', lazy: async () => ({ Component: (await import('@/features/members/pages/MemberFormPage')).MemberFormPage }) },
              { path: 'dues', lazy: async () => ({ Component: (await import('@/features/reminders/pages/DuesPage')).DuesPage }) },
              { path: 'payments', lazy: async () => ({ Component: (await import('@/features/payments/pages/PaymentsPage')).PaymentsPage }) },
              { path: 'analytics', lazy: async () => ({ Component: (await import('@/features/analytics/pages/AnalyticsPage')).AnalyticsPage }) },
              { path: 'settings', lazy: async () => ({ Component: (await import('@/features/settings/pages/SettingsPage')).SettingsPage }) },
              { path: '*', element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
])
