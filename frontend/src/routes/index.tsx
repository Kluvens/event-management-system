import { lazy, Suspense, ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { PageLoader } from '@/components/PageLoader'

// Helper: wraps a named-export page in React.lazy + Suspense so each page is
// a separate chunk that only downloads when its route is first visited.
function lazy_page(
  factory: () => Promise<Record<string, ComponentType>>,
  name: string,
) {
  const Comp = lazy(() => factory().then(mod => ({ default: mod[name] })))
  return (
    <Suspense fallback={<PageLoader />}>
      <Comp />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true,             element: lazy_page(() => import('@/pages/HomePage'),            'HomePage') },
      { path: 'events/:id',      element: lazy_page(() => import('@/pages/EventDetailPage'),     'EventDetailPage') },
      { path: 'organizers/:id',  element: lazy_page(() => import('@/pages/OrganizerProfilePage'),'OrganizerProfilePage') },

      // Auth-required routes
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'profile',              element: lazy_page(() => import('@/pages/ProfilePage'),          'ProfilePage') },
          { path: 'my-bookings',          element: lazy_page(() => import('@/pages/MyBookingsPage'),       'MyBookingsPage') },
          { path: 'favorites',            element: lazy_page(() => import('@/pages/FavoritesPage'),        'FavoritesPage') },
          { path: 'store',                element: lazy_page(() => import('@/pages/StorePage'),            'StorePage') },
          { path: 'events/create',        element: lazy_page(() => import('@/pages/CreateEventPage'),      'CreateEventPage') },
          { path: 'events/:id/edit',      element: lazy_page(() => import('@/pages/EditEventPage'),        'EditEventPage') },
          { path: 'events/:id/insights',  element: lazy_page(() => import('@/pages/EventInsightsPage'),   'EventInsightsPage') },
          { path: 'dashboard',            element: lazy_page(() => import('@/pages/OrganizerDashboardPage'), 'OrganizerDashboardPage') },
          { path: 'checkin',              element: lazy_page(() => import('@/pages/CheckInScannerPage'),   'CheckInScannerPage') },
        ],
      },

      // Admin-only routes
      {
        element: <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} />,
        children: [
          { path: 'admin', element: lazy_page(() => import('@/pages/AdminPage'), 'AdminPage') },
        ],
      },

      { path: 'terms',   element: lazy_page(() => import('@/pages/TermsPage'),    'TermsPage') },
      { path: 'privacy', element: lazy_page(() => import('@/pages/PrivacyPage'),  'PrivacyPage') },
      { path: '*',       element: lazy_page(() => import('@/pages/NotFoundPage'), 'NotFoundPage') },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login',           element: lazy_page(() => import('@/pages/LoginPage'),          'LoginPage') },
      { path: '/register',        element: lazy_page(() => import('@/pages/RegisterPage'),       'RegisterPage') },
      { path: '/forgot-password', element: lazy_page(() => import('@/pages/ForgotPasswordPage'),'ForgotPasswordPage') },
      { path: '/reset-password',  element: lazy_page(() => import('@/pages/ResetPasswordPage'), 'ResetPasswordPage') },
    ],
  },
  { path: '/confirm-email', element: lazy_page(() => import('@/pages/ConfirmEmailPage'), 'ConfirmEmailPage') },
  { path: '/auth/callback',  element: lazy_page(() => import('@/pages/OAuthCallbackPage'), 'OAuthCallbackPage') },
])
