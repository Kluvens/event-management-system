import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import { queryClient } from '@/lib/queryClient'
import type {
  Event,
  EventStats,
  CreateEventRequest,
  PostponeEventRequest,
  EventFilters,
  Announcement,
  CreateAnnouncementRequest,
} from '@/types'

export const eventsApi = {
  list: (filters?: EventFilters) =>
    api
      .get<Event[]>('/events', { params: flattenFilters(filters) })
      .then((r) => r.data),

  get: (id: number) => api.get<Event>(`/events/${id}`).then((r) => r.data),

  stats: (id: number) =>
    api.get<EventStats>(`/events/${id}/stats`).then((r) => r.data),

  create: (data: CreateEventRequest) =>
    api.post<Event>('/events', data).then((r) => r.data),

  update: (id: number, data: CreateEventRequest) => api.put(`/events/${id}`, data),

  delete: (id: number) => api.delete(`/events/${id}`),

  publish: (id: number) => api.post(`/events/${id}/publish`),

  cancel: (id: number) => api.post(`/events/${id}/cancel`),

  postpone: (id: number, data: PostponeEventRequest) =>
    api.post(`/events/${id}/postpone`, data),

  announcements: (id: number) =>
    api.get<Announcement[]>(`/events/${id}/announcements`).then((r) => r.data),

  postAnnouncement: (id: number, data: CreateAnnouncementRequest) =>
    api.post<Announcement>(`/events/${id}/announcements`, data).then((r) => r.data),
}

function flattenFilters(
  filters?: EventFilters
): Record<string, unknown> | undefined {
  if (!filters) return undefined
  const params: Record<string, unknown> = { ...filters }
  if (filters.tagIds?.length) {
    params['tagIds'] = filters.tagIds
  }
  return params
}

export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventsApi.list(filters),
  })
}

export function useEvent(id: number | undefined) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.get(id!),
    enabled: id !== undefined && id > 0,
  })
}

export function useEventStats(id: number | undefined) {
  return useQuery({
    queryKey: ['events', id, 'stats'],
    queryFn: () => eventsApi.stats(id!),
    enabled: id !== undefined && id > 0,
  })
}

export function useAnnouncements(eventId: number | undefined) {
  return useQuery({
    queryKey: ['events', eventId, 'announcements'],
    queryFn: () => eventsApi.announcements(eventId!),
    enabled: eventId !== undefined && eventId > 0,
  })
}

export function useCreateEvent() {
  return useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event created as draft.')
    },
    onError: () => toast.error('Failed to create event.'),
  })
}

export function useUpdateEvent(id: number) {
  return useMutation({
    mutationFn: (data: CreateEventRequest) => eventsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', id] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event updated.')
    },
    onError: () => toast.error('Failed to update event.'),
  })
}

export function useDeleteEvent() {
  return useMutation({
    mutationFn: eventsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event deleted.')
    },
    onError: () => toast.error('Failed to delete event.'),
  })
}

export function usePublishEvent() {
  return useMutation({
    mutationFn: eventsApi.publish,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['events', id] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event published.')
    },
    onError: () => toast.error('Failed to publish event.'),
  })
}

export function useCancelEvent() {
  return useMutation({
    mutationFn: eventsApi.cancel,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['events', id] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event cancelled.')
    },
    onError: () => toast.error('Failed to cancel event.'),
  })
}

export function usePostponeEvent(id: number) {
  return useMutation({
    mutationFn: (data: PostponeEventRequest) => eventsApi.postpone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', id] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event postponed.')
    },
    onError: () => toast.error('Failed to postpone event.'),
  })
}

export function usePostAnnouncement(eventId: number) {
  return useMutation({
    mutationFn: (data: CreateAnnouncementRequest) =>
      eventsApi.postAnnouncement(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['events', eventId, 'announcements'],
      })
      toast.success('Announcement posted.')
    },
    onError: () => toast.error('Failed to post announcement.'),
  })
}
