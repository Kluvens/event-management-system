import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { fetchAuthSession } from 'aws-amplify/auth'
import { router } from '@/routes'
import { queryClient } from '@/lib/queryClient'
import { fetchAppProfile } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'

export default function App() {
  const setUser = useAuthStore((s) => s.setUser)

  // Re-hydrate the user profile on every page load.
  // Amplify persists the Cognito session in localStorage; we just need to
  // fetch the app-specific profile (role, loyalty points, etc.) from our backend.
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
  }, [setUser])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" closeButton />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
