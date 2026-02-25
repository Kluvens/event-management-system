import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/authStore'
import type { WaitlistPosition } from '@/types'

export const waitlistApi = {
  position: (eventId: number) =>
    api.get<WaitlistPosition>(`/events/${eventId}/waitlist/position`).then((r) => r.data),
  join: (eventId: number) => api.post(`/events/${eventId}/waitlist`),
  leave: (eventId: number) => api.delete(`/events/${eventId}/waitlist`),
}

export function useWaitlistPosition(eventId: number) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['waitlist', eventId],
    queryFn: () => waitlistApi.position(eventId),
    enabled: !!user,
    retry: false,
  })
}

export function useJoinWaitlist(eventId: number) {
  return useMutation({
    mutationFn: () => waitlistApi.join(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success("You're on the waitlist!")
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Failed to join waitlist.')
    },
  })
}

export function useLeaveWaitlist(eventId: number) {
  return useMutation({
    mutationFn: () => waitlistApi.leave(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Removed from waitlist.')
    },
    onError: () => toast.error('Failed to leave waitlist.'),
  })
}
