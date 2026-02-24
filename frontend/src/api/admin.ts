import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import { queryClient } from '@/lib/queryClient'
import type {
  AdminUserSummary,
  AdminUserDetail,
  AdminEvent,
  AdminBooking,
  AdminStats,
  LoyaltyPointsResponse,
  UserRole,
  Category,
  Tag,
} from '@/types'

interface AdminUserFilters {
  search?: string
  role?: string
  isSuspended?: boolean
}

interface AdminEventFilters {
  search?: string
  isSuspended?: boolean
  status?: string
}

interface AdminBookingFilters {
  userId?: number
  eventId?: number
  status?: string
}

export const adminApi = {
  stats: () => api.get<AdminStats>('/admin/stats').then((r) => r.data),

  users: (filters?: AdminUserFilters) =>
    api
      .get<AdminUserSummary[]>('/admin/users', { params: filters })
      .then((r) => r.data),

  user: (id: number) =>
    api.get<AdminUserDetail>(`/admin/users/${id}`).then((r) => r.data),

  suspendUser: (id: number) => api.post(`/admin/users/${id}/suspend`),
  unsuspendUser: (id: number) => api.post(`/admin/users/${id}/unsuspend`),

  setRole: (id: number, role: UserRole) =>
    api.put(`/admin/users/${id}/role`, { role }),

  adjustPoints: (id: number, delta: number) =>
    api
      .post<LoyaltyPointsResponse>(`/admin/users/${id}/adjust-points`, { delta })
      .then((r) => r.data),

  events: (filters?: AdminEventFilters) =>
    api
      .get<AdminEvent[]>('/admin/events', { params: filters })
      .then((r) => r.data),

  suspendEvent: (id: number) => api.post(`/admin/events/${id}/suspend`),
  unsuspendEvent: (id: number) => api.post(`/admin/events/${id}/unsuspend`),

  bookings: (filters?: AdminBookingFilters) =>
    api
      .get<AdminBooking[]>('/admin/bookings', { params: filters })
      .then((r) => r.data),

  createCategory: (name: string) =>
    api.post<Category>('/admin/categories', { name }).then((r) => r.data),

  updateCategory: (id: number, name: string) =>
    api.put(`/admin/categories/${id}`, { name }),

  deleteCategory: (id: number) => api.delete(`/admin/categories/${id}`),

  createTag: (name: string) =>
    api.post<Tag>('/admin/tags', { name }).then((r) => r.data),

  updateTag: (id: number, name: string) =>
    api.put(`/admin/tags/${id}`, { name }),

  deleteTag: (id: number) => api.delete(`/admin/tags/${id}`),
}

export function useAdminStats() {
  return useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.stats })
}

export function useAdminUsers(filters?: AdminUserFilters) {
  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => adminApi.users(filters),
  })
}

export function useAdminUser(id: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => adminApi.user(id!),
    enabled: id !== undefined,
  })
}

export function useAdminEvents(filters?: AdminEventFilters) {
  return useQuery({
    queryKey: ['admin', 'events', filters],
    queryFn: () => adminApi.events(filters),
  })
}

export function useAdminBookings(filters?: AdminBookingFilters) {
  return useQuery({
    queryKey: ['admin', 'bookings', filters],
    queryFn: () => adminApi.bookings(filters),
  })
}

export function useSuspendUser() {
  return useMutation({
    mutationFn: adminApi.suspendUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User suspended.')
    },
    onError: () => toast.error('Failed to suspend user.'),
  })
}

export function useUnsuspendUser() {
  return useMutation({
    mutationFn: adminApi.unsuspendUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User reinstated.')
    },
    onError: () => toast.error('Failed to reinstate user.'),
  })
}

export function useSetUserRole() {
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: UserRole }) =>
      adminApi.setRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Role updated.')
    },
    onError: () => toast.error('Failed to update role.'),
  })
}

export function useAdjustPoints() {
  return useMutation({
    mutationFn: ({ id, delta }: { id: number; delta: number }) =>
      adminApi.adjustPoints(id, delta),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success(
        `Points adjusted. Balance: ${data.loyaltyPoints.toLocaleString()} pts (${data.loyaltyTier})`
      )
    },
    onError: () => toast.error('Failed to adjust points.'),
  })
}

export function useSuspendEvent() {
  return useMutation({
    mutationFn: adminApi.suspendEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
      toast.success('Event suspended.')
    },
  })
}

export function useUnsuspendEvent() {
  return useMutation({
    mutationFn: adminApi.unsuspendEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
      toast.success('Event restored.')
    },
  })
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: adminApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category created.')
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } }).response?.status
      toast.error(
        status === 409 ? 'Category already exists.' : 'Failed to create category.'
      )
    },
  })
}

export function useUpdateCategory() {
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      adminApi.updateCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category renamed.')
    },
    onError: () => toast.error('Failed to rename category.'),
  })
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category deleted.')
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } }).response?.status
      toast.error(
        status === 409
          ? 'Events are using this category.'
          : 'Failed to delete category.'
      )
    },
  })
}

export function useCreateTag() {
  return useMutation({
    mutationFn: adminApi.createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success('Tag created.')
    },
    onError: () => toast.error('Tag already exists or failed to create.'),
  })
}

export function useUpdateTag() {
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      adminApi.updateTag(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success('Tag renamed.')
    },
    onError: () => toast.error('Failed to rename tag.'),
  })
}

export function useDeleteTag() {
  return useMutation({
    mutationFn: adminApi.deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success('Tag deleted.')
    },
    onError: () => toast.error('Failed to delete tag.'),
  })
}
