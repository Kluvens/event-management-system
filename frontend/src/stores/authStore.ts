import { create } from 'zustand'
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

// No persist middleware — Amplify owns token storage in localStorage.
// The app profile is re-fetched from /api/auth/me on each app load (see App.tsx).
export const useAuthStore = create<AuthState>()((set, get) => ({
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
}))
