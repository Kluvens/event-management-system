import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './axios'
import { queryClient } from '@/lib/queryClient'
import type {
  StoreProduct,
  UserPurchase,
  PurchaseProductResponse,
  CreateProductRequest,
  UpdateProductRequest,
} from '@/types'

export const storeApi = {
  listProducts: (category?: string) =>
    api
      .get<StoreProduct[]>('/store/products', { params: category ? { category } : undefined })
      .then((r) => r.data),

  purchase: (productId: number) =>
    api.post<PurchaseProductResponse>('/store/purchase', { productId }).then((r) => r.data),

  myPurchases: () =>
    api.get<UserPurchase[]>('/store/my-purchases').then((r) => r.data),

  // Admin
  createProduct: (data: CreateProductRequest) =>
    api.post<StoreProduct>('/store/products', data).then((r) => r.data),

  updateProduct: (id: number, data: UpdateProductRequest) =>
    api.put<StoreProduct>(`/store/products/${id}`, data).then((r) => r.data),

  deactivateProduct: (id: number) => api.delete(`/store/products/${id}`),
}

export function useStoreProducts(category?: string) {
  return useQuery({
    queryKey: ['store-products', category ?? 'all'],
    queryFn: () => storeApi.listProducts(category),
  })
}

export function usePurchaseProduct() {
  return useMutation({
    mutationFn: storeApi.purchase,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] })
      queryClient.invalidateQueries({ queryKey: ['store-my-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['auth-profile'] })
      toast.success(`Purchased! ${data.remainingPoints.toLocaleString()} points remaining.`)
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) toast.error('You already own this item.')
      else if (status === 400) toast.error('Not enough loyalty points.')
      else toast.error('Purchase failed.')
    },
  })
}

export function useMyPurchases() {
  return useQuery({
    queryKey: ['store-my-purchases'],
    queryFn: storeApi.myPurchases,
  })
}

// ── Admin hooks ──────────────────────────────────────────────────────────────

export function useCreateProduct() {
  return useMutation({
    mutationFn: storeApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] })
      toast.success('Product created.')
    },
    onError: () => toast.error('Failed to create product.'),
  })
}

export function useUpdateProduct() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductRequest }) =>
      storeApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] })
      toast.success('Product updated.')
    },
    onError: () => toast.error('Failed to update product.'),
  })
}

export function useDeactivateProduct() {
  return useMutation({
    mutationFn: storeApi.deactivateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-products'] })
      toast.success('Product deactivated.')
    },
    onError: () => toast.error('Failed to deactivate product.'),
  })
}
