import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import { queryClient } from '@/lib/queryClient'
import type { PayoutRequest, AdminPayoutRequest, CreatePayoutRequestRequest } from '@/types'

export const payoutsApi = {
  mine: () => api.get<PayoutRequest[]>('/payouts/mine').then((r) => r.data),
  create: (data: CreatePayoutRequestRequest) =>
    api.post<PayoutRequest>('/payouts', data).then((r) => r.data),
  all: (status?: string) =>
    api.get<AdminPayoutRequest[]>('/payouts', { params: status ? { status } : undefined }).then((r) => r.data),
  process: (id: number, status: 'Approved' | 'Rejected', adminNotes?: string) =>
    api.patch(`/payouts/${id}`, { status, adminNotes }),
}

export function useMyPayouts() {
  return useQuery({ queryKey: ['payouts-mine'], queryFn: payoutsApi.mine })
}

export function useCreatePayout() {
  return useMutation({
    mutationFn: payoutsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts-mine'] })
      toast.success('Payout request submitted.')
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) toast.error('You already have a pending payout request.')
      else toast.error('Failed to submit payout request.')
    },
  })
}

export function useAdminPayouts(status?: string) {
  return useQuery({ queryKey: ['payouts-admin', status ?? 'all'], queryFn: () => payoutsApi.all(status) })
}

export function useProcessPayout() {
  return useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: number; status: 'Approved' | 'Rejected'; adminNotes?: string }) =>
      payoutsApi.process(id, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts-admin'] })
      toast.success('Payout request updated.')
    },
    onError: () => toast.error('Failed to update payout request.'),
  })
}
