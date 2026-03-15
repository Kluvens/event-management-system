import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // ASP.NET Core [FromQuery] List<int> expects repeated keys: tagIds=1&tagIds=2
  // Axios default uses bracket notation (tagIds[0]=1) which .NET does not parse.
  paramsSerializer: (params) => {
    const sp = new URLSearchParams()
    for (const [key, val] of Object.entries(params)) {
      if (Array.isArray(val)) {
        val.forEach((v) => sp.append(key, String(v)))
      } else if (val !== undefined && val !== null) {
        sp.append(key, String(val))
      }
    }
    return sp.toString()
  },
})

// Attach the Cognito ID token to every request (contains email/name claims for CognitoUserResolver).
// fetchAuthSession is dynamically imported so that aws-amplify/auth stays out of the entry chunk
// AND so the call only happens after Amplify.configure() has run (lazy-initialised in App.tsx).
api.interceptors.request.use(async (config) => {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth')
    const session = await fetchAuthSession()
    const token   = session.tokens?.idToken?.toString()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // No active session or Amplify not yet configured — request proceeds unauthenticated
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const typedError = error as {
      response?: { status?: number }
      config?: { headers?: Record<string, string> }
    }
    // Only clear the session if we actually sent a Bearer token that the server rejected.
    // Ignoring 401s without a token prevents a race condition (Amplify not yet configured →
    // no token attached → 401) from wiping a valid Cognito session stored in localStorage.
    // This also avoids logging the user out when Lighthouse runs via Chrome DevTools, which
    // shares localStorage with the real browser.
    if (
      typedError.response?.status === 401 &&
      typedError.config?.headers?.Authorization
    ) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
