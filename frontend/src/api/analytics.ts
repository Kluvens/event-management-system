import { useQuery } from '@tanstack/react-query'
import { api } from './axios'
import type { EventAnalytics } from '@/types'

export const analyticsApi = {
  event: (id: number) =>
    api.get<EventAnalytics>(`/events/${id}/analytics`).then((r) => r.data),
}

export function useEventAnalytics(eventId: number, enabled = true) {
  return useQuery({
    queryKey: ['analytics', eventId],
    queryFn: () => analyticsApi.event(eventId),
    enabled,
    staleTime: 60_000,
  })
}
