import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface PromotionLink {
  tierId: string
  promotionId: string
}

export function usePromotionLinks() {
  return useQuery<PromotionLink[]>({
    queryKey: ['promotion-links'],
    queryFn: async () => {
      const res = await api.get('/loyalty/promotions-links')
      // Backend returns { success, data }
      return res.data?.data ?? []
    },
    staleTime: 10_000,
  })
}

export function useTierPromotionLinks(tierId?: string | number) {
  return useQuery<PromotionLink[]>({
    queryKey: ['promotion-links', 'tier', String(tierId ?? '')],
    queryFn: async () => {
      if (!tierId) return []
      const res = await api.get(`/loyalty/tiers/${tierId}/promotions-links`)
      return res.data?.data ?? []
    },
    enabled: !!tierId,
    staleTime: 10_000,
  })
}

export function useLinkPromotionToTier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { tierId: string | number; promotionId: string }) => {
      const res = await api.post('/loyalty/promotions-links', payload)
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['promotion-links'] })
      qc.invalidateQueries({ queryKey: ['promotion-links', 'tier', String(variables.tierId)] })
    },
  })
}

export function useUnlinkPromotionFromTier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { tierId: string | number; promotionId: string }) => {
      const res = await api.delete(`/loyalty/promotions-links/${payload.tierId}/${payload.promotionId}`)
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['promotion-links'] })
      qc.invalidateQueries({ queryKey: ['promotion-links', 'tier', String(variables.tierId)] })
    },
  })
}