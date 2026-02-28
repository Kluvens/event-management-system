import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/types'

export interface AppUser {
  userId:           number
  name:             string
  email:            string
  role:             UserRole
  loyaltyPoints:    number
  loyaltyTier:      string
  isSuspended:      boolean
  twitterHandle?:   string | null
  instagramHandle?: string | null
  bio?:             string | null
  website?:         string | null
}

interface AuthState {
  user:         AppUser | null
  /** True while the initial Amplify session + profile fetch is in flight */
  isHydrating:  boolean
  setUser:      (u: AppUser | null) => void
  setHydrated:  () => void
  logout:       () => void
  isAdmin:      () => boolean
  isSuperAdmin: () => boolean
}

// The user profile is persisted in localStorage so it's available immediately
// on page load — even before the async Amplify session check completes.
// isHydrating is intentionally NOT persisted: it always starts true so that
// App.tsx validates the Cognito session on every load, silently refreshing
// the cached profile in the background.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:        null,
      isHydrating: true,
      setUser:     (u) => set({ user: u }),
      setHydrated: () => set({ isHydrating: false }),
      logout:      () => set({ user: null }),
      isAdmin: () => {
        const role = get().user?.role
        return role === 'Admin' || role === 'SuperAdmin'
      },
      isSuperAdmin: () => get().user?.role === 'SuperAdmin',
    }),
    {
      name: 'event-hub-auth',
      // Only persist the user profile — not the transient isHydrating flag
      partialize: (state) => ({ user: state.user }),
    }
  )
)
