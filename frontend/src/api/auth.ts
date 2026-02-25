import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  updatePassword,
  signInWithRedirect,
} from 'aws-amplify/auth'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import { useAuthStore } from '@/stores/authStore'
import type { AppUser } from '@/stores/authStore'

// ── Profile sync ────────────────────────────────────────────────────────────

/**
 * Fetches the app-specific user profile from the backend after Cognito auth.
 * On first login, the backend auto-provisions a local User row.
 */
export async function fetchAppProfile(): Promise<AppUser> {
  return api.get<AppUser>('/auth/me').then((r) => r.data)
}

// ── Email / password login ──────────────────────────────────────────────────

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      await signIn({ username: email, password })
      return fetchAppProfile()
    },
    onSuccess: (profile) => {
      if (profile.isSuspended) {
        signOut()
        toast.error('Your account has been suspended. Please contact support.')
        return
      }
      setUser(profile)
      toast.success(`Welcome back, ${profile.name}!`)
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message ?? 'Sign in failed.')
    },
  })
}

// ── Registration ────────────────────────────────────────────────────────────

export function useRegister() {
  return useMutation({
    mutationFn: async ({
      name,
      email,
      password,
    }: {
      name: string
      email: string
      password: string
    }) => {
      await signUp({
        username: email,
        password,
        options: { userAttributes: { email, name } },
      })
      return email
    },
    onSuccess: () => {
      toast.success('Check your email to confirm your account.')
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message ?? 'Registration failed.')
    },
  })
}

// ── Email confirmation ──────────────────────────────────────────────────────

export function useConfirmSignUp() {
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      confirmSignUp({ username: email, confirmationCode: code }),
    onSuccess: () => {
      toast.success('Email confirmed! You can now sign in.')
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message ?? 'Confirmation failed.')
    },
  })
}

// ── Change password ─────────────────────────────────────────────────────────

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      updatePassword({ oldPassword, newPassword }),
    onSuccess: () => toast.success('Password updated.'),
    onError: (err: unknown) =>
      toast.error((err as Error).message ?? 'Failed to update password.'),
  })
}

// ── Social login (Google / Facebook) ───────────────────────────────────────

export function signInWithGoogle() {
  return signInWithRedirect({ provider: 'Google' })
}

export function signInWithFacebook() {
  return signInWithRedirect({ provider: 'Facebook' })
}
