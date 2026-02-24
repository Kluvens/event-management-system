import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole, AuthResponse } from '@/types'

interface AuthUser {
  userId: number
  name: string
  email: string
  role: UserRole
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  login: (data: AuthResponse) => void
  logout: () => void
  isAdmin: () => boolean
  isSuperAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: (data: AuthResponse) =>
        set({
          token: data.token,
          user: {
            userId: data.userId,
            name: data.name,
            email: data.email,
            role: data.role,
          },
        }),
      logout: () => set({ token: null, user: null }),
      isAdmin: () => {
        const role = get().user?.role
        return role === 'Admin' || role === 'SuperAdmin'
      },
      isSuperAdmin: () => get().user?.role === 'SuperAdmin',
    }),
    { name: 'auth-storage' }
  )
)
