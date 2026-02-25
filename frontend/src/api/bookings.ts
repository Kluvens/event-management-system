import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import { queryClient } from '@/lib/queryClient'
import type { Booking, CheckInInfo } from '@/types'

export const bookingsApi = {
  mine: () => api.get<Booking[]>('/bookings/mine').then((r) => r.data),

  create: (eventId: number) =>
    api.post<Booking>('/bookings', { eventId }).then((r) => r.data),

  cancel: (id: number) => api.delete(`/bookings/${id}`),

  checkinById: (id: number) => api.post(`/bookings/${id}/checkin`),

  lookupToken: (token: string) =>
    api.get<CheckInInfo>(`/bookings/checkin/${token}`).then((r) => r.data),

  checkinByToken: (token: string) => api.post(`/bookings/checkin/${token}`),

  downloadIcs: (id: number) =>
    api.get(`/bookings/${id}/ics`, { responseType: 'blob' }).then((r) => r.data as Blob),
}

export function useMineBookings() {
  return useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: bookingsApi.mine,
  })
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Booking confirmed!')
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) toast.error('You already have a booking for this event.')
      else if (status === 400) toast.error('Event is not available for booking.')
      else toast.error('Failed to create booking.')
    },
  })
}

export function useCancelBooking() {
  return useMutation({
    mutationFn: bookingsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Booking cancelled.')
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 400)
        toast.error('Cannot cancel within 7 days of the event.')
      else toast.error('Failed to cancel booking.')
    },
  })
}

export function useCheckinById() {
  return useMutation({
    mutationFn: bookingsApi.checkinById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizer', 'attendees'] })
      toast.success('Attendee checked in.')
    },
    onError: () => toast.error('Check-in failed.'),
  })
}

export function useLookupToken(token: string | undefined) {
  return useQuery({
    queryKey: ['checkin', 'token', token],
    queryFn: () => bookingsApi.lookupToken(token!),
    enabled: !!token,
    retry: false,
  })
}

export function useCheckinByToken() {
  return useMutation({
    mutationFn: bookingsApi.checkinByToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin'] })
      queryClient.invalidateQueries({ queryKey: ['organizer', 'attendees'] })
      toast.success('Attendee checked in via QR.')
    },
    onError: () => toast.error('Check-in failed.'),
  })
}
