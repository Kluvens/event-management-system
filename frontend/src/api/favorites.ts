import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/authStore'
import type { Event } from '@/types'

export const favoritesApi = {
  list: () => api.get<Event[]>('/favorites').then((r) => r.data),
  ids:  () => api.get<number[]>('/favorites/ids').then((r) => r.data),
  add:  (eventId: number) => api.post(`/favorites/${eventId}`),
  remove: (eventId: number) => api.delete(`/favorites/${eventId}`),
}

export function useMyFavorites() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesApi.list,
    enabled: !!user,
  })
}

export function useMyFavoriteIds() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['favorites', 'ids'],
    queryFn: favoritesApi.ids,
    enabled: !!user,
    staleTime: 30_000,
  })
}

export function useToggleFavorite(eventId: number) {
  const addMutation = useMutation({
    mutationFn: () => favoritesApi.add(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: () => toast.error('Failed to save event.'),
  })

  const removeMutation = useMutation({
    mutationFn: () => favoritesApi.remove(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: () => toast.error('Failed to remove event.'),
  })

  return { addMutation, removeMutation }
}
