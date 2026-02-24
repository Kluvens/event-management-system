import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import { queryClient } from '@/lib/queryClient'
import type {
  OrganizerProfile,
  OrganizerDashboard,
  UpdateOrganizerProfileRequest,
  AttendeeRecord,
} from '@/types'

export const organizersApi = {
  profile: (id: number) =>
    api.get<OrganizerProfile>(`/organizers/${id}`).then((r) => r.data),

  dashboard: () =>
    api.get<OrganizerDashboard>('/organizers/me/dashboard').then((r) => r.data),

  updateProfile: (data: UpdateOrganizerProfileRequest) =>
    api.put('/organizers/me/profile', data),

  attendees: (eventId: number) =>
    api
      .get<AttendeeRecord[]>(`/organizers/me/events/${eventId}/attendees`)
      .then((r) => r.data),

  exportAttendees: (eventId: number) =>
    api.get(`/organizers/me/events/${eventId}/attendees/export`, {
      responseType: 'blob',
    }),

  cancelBooking: (eventId: number, bookingId: number) =>
    api.delete(`/organizers/me/events/${eventId}/bookings/${bookingId}`),
}

export function useOrganizerProfile(id: number | undefined) {
  return useQuery({
    queryKey: ['organizer', id],
    queryFn: () => organizersApi.profile(id!),
    enabled: id !== undefined && id > 0,
  })
}

export function useOrganizerDashboard() {
  return useQuery({
    queryKey: ['organizer', 'dashboard'],
    queryFn: organizersApi.dashboard,
  })
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: organizersApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer'] })
      toast.success('Profile updated.')
    },
    onError: () => toast.error('Failed to update profile.'),
  })
}

export function useEventAttendees(eventId: number | undefined) {
  return useQuery({
    queryKey: ['organizer', 'attendees', eventId],
    queryFn: () => organizersApi.attendees(eventId!),
    enabled: eventId !== undefined && eventId > 0,
  })
}

export function useOrganizerCancelBooking(eventId: number) {
  return useMutation({
    mutationFn: (bookingId: number) =>
      organizersApi.cancelBooking(eventId, bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizer', 'attendees', eventId],
      })
      toast.success('Booking refunded.')
    },
    onError: () => toast.error('Failed to refund booking.'),
  })
}
