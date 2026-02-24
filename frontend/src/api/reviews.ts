import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import { queryClient } from '@/lib/queryClient'
import type { Review, CreateReviewRequest } from '@/types'

export const reviewsApi = {
  list: (eventId: number, sort?: string) =>
    api
      .get<Review[]>(`/events/${eventId}/reviews`, { params: { sort } })
      .then((r) => r.data),

  create: (eventId: number, data: CreateReviewRequest) =>
    api.post<Review>(`/events/${eventId}/reviews`, data).then((r) => r.data),

  delete: (eventId: number, reviewId: number) =>
    api.delete(`/events/${eventId}/reviews/${reviewId}`),

  pin: (eventId: number, reviewId: number) =>
    api.post(`/events/${eventId}/reviews/${reviewId}/pin`),

  reply: (eventId: number, reviewId: number, comment: string) =>
    api.post(`/events/${eventId}/reviews/${reviewId}/replies`, { comment }),

  vote: (eventId: number, reviewId: number, isLike: boolean) =>
    api.post(`/events/${eventId}/reviews/${reviewId}/vote`, { isLike }),
}

export function useReviews(eventId: number | undefined, sort?: string) {
  return useQuery({
    queryKey: ['reviews', eventId, sort],
    queryFn: () => reviewsApi.list(eventId!, sort),
    enabled: eventId !== undefined && eventId > 0,
  })
}

export function useCreateReview(eventId: number) {
  return useMutation({
    mutationFn: (data: CreateReviewRequest) => reviewsApi.create(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'stats'] })
      toast.success('Review submitted.')
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) toast.error('You have already reviewed this event.')
      else if (status === 400)
        toast.error('You need a confirmed booking and the event must have started.')
      else toast.error('Failed to submit review.')
    },
  })
}

export function useDeleteReview(eventId: number) {
  return useMutation({
    mutationFn: (reviewId: number) => reviewsApi.delete(eventId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', eventId] })
      toast.success('Review deleted.')
    },
  })
}

export function usePinReview(eventId: number) {
  return useMutation({
    mutationFn: (reviewId: number) => reviewsApi.pin(eventId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', eventId] })
      toast.success('Review pinned.')
    },
  })
}

export function useReplyToReview(eventId: number) {
  return useMutation({
    mutationFn: ({
      reviewId,
      comment,
    }: {
      reviewId: number
      comment: string
    }) => reviewsApi.reply(eventId, reviewId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', eventId] })
      toast.success('Reply posted.')
    },
  })
}

export function useVoteReview(eventId: number) {
  const qc = useQueryClient()
  return useMutation<
    unknown,
    Error,
    { reviewId: number; isLike: boolean },
    { prev?: Review[] }
  >({
    mutationFn: ({ reviewId, isLike }) =>
      reviewsApi.vote(eventId, reviewId, isLike),
    onMutate: async ({ reviewId, isLike }) => {
      await qc.cancelQueries({ queryKey: ['reviews', eventId] })
      const prev = qc.getQueryData<Review[]>(['reviews', eventId])
      qc.setQueryData<Review[]>(['reviews', eventId], (old) =>
        old?.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                likes: isLike ? r.likes + 1 : r.likes,
                dislikes: !isLike ? r.dislikes + 1 : r.dislikes,
              }
            : r
        )
      )
      return { prev }
    },
    onError: (
      _err: unknown,
      _vars: unknown,
      ctx: { prev?: Review[] } | undefined
    ) => {
      if (ctx?.prev) qc.setQueryData(['reviews', eventId], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['reviews', eventId] })
    },
  })
}
