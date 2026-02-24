import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import type { Subscription, Subscriber } from '@/types'

export const subscriptionsApi = {
  list: () => api.get<Subscription[]>('/subscriptions').then((r) => r.data),
  subscribers: () =>
    api.get<Subscriber[]>('/subscriptions/subscribers').then((r) => r.data),
  follow: (hostId: number) => api.post(`/subscriptions/${hostId}`),
  unfollow: (hostId: number) => api.delete(`/subscriptions/${hostId}`),
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: subscriptionsApi.list,
  })
}

export function useSubscribers() {
  return useQuery({
    queryKey: ['subscriptions', 'subscribers'],
    queryFn: subscriptionsApi.subscribers,
  })
}

export function useFollowHost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: subscriptionsApi.follow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
      qc.invalidateQueries({ queryKey: ['organizer'] })
      toast.success('Now following this organizer.')
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) toast.error('Already following.')
      else if (status === 400) toast.error('You cannot follow yourself.')
      else toast.error('Failed to follow.')
    },
  })
}

export function useUnfollowHost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: subscriptionsApi.unfollow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
      qc.invalidateQueries({ queryKey: ['organizer'] })
      toast.success('Unfollowed.')
    },
    onError: () => toast.error('Failed to unfollow.'),
  })
}
