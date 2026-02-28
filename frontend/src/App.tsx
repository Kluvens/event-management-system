import { fetchAppProfile } from '@/api/auth'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/routes'
import { useAuthStore } from '@/stores/authStore'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { fetchAuthSession } from 'aws-amplify/auth'
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'

export default function App() {
  const setUser = useAuthStore((s) => s.setUser)
  const setHydrated = useAuthStore((s) => s.setHydrated)

  // Re-hydrate the user profile on every page load.
  // Amplify persists the Cognito session in localStorage; we just need to
  // fetch the app-specific profile (role, loyalty points, etc.) from our backend.
  // setHydrated() is always called so ProtectedRoute knows when it's safe to redirect.
  useEffect(() => {
    fetchAuthSession()
      .then((session) => {
        if (session.tokens?.idToken) {
          return fetchAppProfile()
        }
      })
      .then((profile) => {
        if (profile) setUser(profile)
      })
      .catch(() => {
        // No active Cognito session — user stays logged out
      })
      .finally(() => {
        setHydrated()
      })
  }, [setUser, setHydrated])

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" closeButton />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
