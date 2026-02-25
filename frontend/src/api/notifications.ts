import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from './axios'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/authStore'
import type { Notification, UnreadCountResponse } from '@/types'

export const notificationsApi = {
  list:       () => api.get<Notification[]>('/notifications').then((r) => r.data),
  unreadCount: () => api.get<UnreadCountResponse>('/notifications/unread-count').then((r) => r.data),
  markRead:   (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}

export function useNotifications() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useUnreadCount() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.unreadCount,
    enabled: !!user,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useMarkRead() {
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllRead() {
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
