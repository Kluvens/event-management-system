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

  // Only block on hydration when there is no cached user in localStorage.
  // If the user profile was persisted, render the page immediately and let
  // the background Amplify validation refresh it silently. This prevents a
  // loading flash for returning users AND prevents a premature /login redirect
  // caused by Cognito token-rotation conflicts on rapid page reloads.
  if (isHydrating && !user) {
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
