import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import { useAuthStore } from '@/stores/authStore'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types'

const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
}

export function useLogin() {
  const login = useAuthStore((s) => s.login)
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data)
      toast.success(`Welcome back, ${data.name}!`)
    },
    onError: () => {
      toast.error('Invalid email or password, or your account is suspended.')
    },
  })
}

export function useRegister() {
  const login = useAuthStore((s) => s.login)
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      login(data)
      toast.success(`Account created! Welcome, ${data.name}!`)
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } }).response?.status
      toast.error(
        status === 409 ? 'Email already in use.' : 'Registration failed. Please try again.'
      )
    },
  })
}
