import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hub } from 'aws-amplify/utils'
import { fetchAuthSession } from 'aws-amplify/auth'
import { fetchAppProfile } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'

/**
 * Landing page for the Cognito Hosted UI OAuth redirect.
 * Amplify automatically exchanges the auth code for tokens in the background.
 * We wait for the Hub "signInWithRedirect" event (tokens ready) before
 * fetching the app profile, to avoid a 401 from hitting the API before
 * the session is established.
 */
export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const setUser  = useAuthStore((s) => s.setUser)

  useEffect(() => {
    let done = false

    async function handleSignedIn() {
      if (done) return
      try {
        const profile = await fetchAppProfile()
        done = true
        setUser(profile)
        navigate('/', { replace: true })
      } catch {
        // fetchAppProfile failed even after tokens were issued
        done = true
        navigate('/login', { replace: true })
      }
    }

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signInWithRedirect') {
        handleSignedIn()
      } else if (payload.event === 'signInWithRedirect_failure') {
        done = true
        navigate('/login', { replace: true })
      }
    })

    // Fallback: if Amplify already finished the token exchange before this
    // component mounted, the Hub event has already fired — only proceed if
    // tokens are actually available to avoid a premature 401.
    fetchAuthSession()
      .then((session) => { if (session.tokens?.idToken) handleSignedIn() })
      .catch(() => { /* no session yet — wait for Hub event */ })

    return unsubscribe
  }, [navigate, setUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <p className="text-slate-400">Completing sign in…</p>
    </div>
  )
}
