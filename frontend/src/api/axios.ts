import axios from 'axios'
import { fetchAuthSession, signOut } from 'aws-amplify/auth'
import { useAuthStore } from '@/stores/authStore'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach the Cognito ID token to every request (contains email/name claims for CognitoUserResolver)
api.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession()
    const token   = session.tokens?.idToken?.toString()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // No active session — request proceeds unauthenticated
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if ((error as { response?: { status?: number } }).response?.status === 401) {
      await signOut()
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
