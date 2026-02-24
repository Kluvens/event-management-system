import { useQuery } from '@tanstack/react-query'
import { api } from './axios'
import type { Tag, Category } from '@/types'

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<Tag[]>('/tags').then((r) => r.data),
    staleTime: Infinity,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/categories').then((r) => r.data),
    staleTime: Infinity,
  })
}
