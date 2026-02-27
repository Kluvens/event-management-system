import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ProtectedRoute } from './ProtectedRoute'

import { HomePage } from '@/pages/HomePage'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ConfirmEmailPage } from '@/pages/ConfirmEmailPage'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'
import { MyBookingsPage } from '@/pages/MyBookingsPage'
import { FavoritesPage } from '@/pages/FavoritesPage'
import { CreateEventPage } from '@/pages/CreateEventPage'
import { EditEventPage } from '@/pages/EditEventPage'
import { OrganizerDashboardPage } from '@/pages/OrganizerDashboardPage'
import { OrganizerProfilePage } from '@/pages/OrganizerProfilePage'
import { AdminPage } from '@/pages/AdminPage'
import { CheckInScannerPage } from '@/pages/CheckInScannerPage'
import { StorePage } from '@/pages/StorePage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'events/:id', element: <EventDetailPage /> },
      { path: 'organizers/:id', element: <OrganizerProfilePage /> },

      // Auth-required routes
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'profile', element: <ProfilePage /> },
          { path: 'my-bookings', element: <MyBookingsPage /> },
          { path: 'favorites', element: <FavoritesPage /> },
          { path: 'store', element: <StorePage /> },
          { path: 'events/create', element: <CreateEventPage /> },
          { path: 'events/:id/edit', element: <EditEventPage /> },
          { path: 'dashboard', element: <OrganizerDashboardPage /> },
          { path: 'checkin', element: <CheckInScannerPage /> },
        ],
      },

      // Admin-only routes
      {
        element: <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} />,
        children: [{ path: 'admin', element: <AdminPage /> }],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  { path: '/confirm-email', element: <ConfirmEmailPage /> },
  { path: '/auth/callback',  element: <OAuthCallbackPage /> },
])
