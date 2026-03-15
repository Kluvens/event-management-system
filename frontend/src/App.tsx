import { fetchAppProfile } from '@/api/auth'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/routes'
import { useAuthStore } from '@/stores/authStore'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
// Vite replaces import.meta.env.DEV with `false` in production builds,
// which lets Rollup tree-shake the entire devtools module out of the bundle.
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
    // `cancelled` prevents React StrictMode's double-invocation from firing two
    // simultaneous /api/auth/me requests.  The cleanup sets it to true so the
    // first mount's promise chain bails out before reaching fetchAppProfile().
    let cancelled = false

    // Dynamic-import Amplify so the aws-amplify ecosystem is excluded from
    // the critical-path bundle.  Amplify.configure() must run before the
    // first fetchAuthSession() call — both happen in this chain, so ordering
    // is guaranteed.
    import('./lib/amplify')
      .then(() => import('aws-amplify/auth'))
      .then(({ fetchAuthSession }) => fetchAuthSession())
      .then((session) => {
        if (cancelled) return
        if (session.tokens?.idToken) {
          return fetchAppProfile()
        }
        // No tokens — definitively not logged in
        setUser(null)
      })
      .then((profile) => {
        if (cancelled) return
        if (profile) setUser(profile)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // Cognito-specific "no session" errors mean the user is genuinely logged out.
        // Anything else (network blip, token-rotation conflict from rapid reloads) is
        // transient — keep the cached localStorage profile so the user stays logged in.
        const name = (err as { name?: string })?.name
        const isDefinitelyLoggedOut =
          name === 'UserUnAuthenticatedException' ||
          name === 'NotAuthorizedException'
        if (isDefinitelyLoggedOut) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setHydrated()
      })

    return () => { cancelled = true }
  }, [setUser, setHydrated])

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" closeButton />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
