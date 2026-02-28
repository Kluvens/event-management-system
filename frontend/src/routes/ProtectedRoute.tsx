import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { UserRole } from '@/types'

interface Props {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: Props) {
  const { user, isHydrating } = useAuthStore()
  const location = useLocation()

  // Wait for the initial Amplify session restore before deciding to redirect.
  // Without this, user is always null on first render and the route immediately
  // redirects to /login even when there is a valid session.
  if (isHydrating) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
