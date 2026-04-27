import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { getSelectedOrganizationId } from '@/lib/organization-context'

export interface PromotionProduct {
  id: string
  name: string
  price: number
  imageUrl?: string
  category?: string
  categoryId?: string
  stock: number
}

interface UsePromotionProductsReturn {
  products: PromotionProduct[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  addProducts: (productIds: string[]) => Promise<{ success: boolean; message?: string }>
  removeProduct: (productId: string) => Promise<{ success: boolean; message?: string }>
}

function getOrgHeaders(): Record<string, string> {
  const orgId = getSelectedOrganizationId()
  if (!orgId) return {}
  return { 'x-organization-id': orgId }
}

export function usePromotionProducts(promotionId: string | null): UsePromotionProductsReturn {
  const [products, setProducts] = useState<PromotionProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    if (!promotionId) {
      setProducts([])
      return
    }

    const orgId = getSelectedOrganizationId()
    if (!orgId) {
      setError('No se encontró la organización activa. Recarga la página.')
      setProducts([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.get(`/promotions/${promotionId}/products`, {
        headers: { 'x-organization-id': orgId },
      })

      if (response.data?.success) {
        setProducts(response.data.data || [])
      } else {
        setError(response.data?.message || 'Error al cargar productos')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar productos'
      setError(message)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [promotionId])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const addProducts = useCallback(
    async (productIds: string[]) => {
      if (!promotionId) return { success: false, message: 'No hay promoción seleccionada' }

      try {
        const response = await api.post(
          `/promotions/${promotionId}/products`,
          { productIds },
          { headers: getOrgHeaders() },
        )

        if (response.data?.success) {
          await fetchProducts()
          return { success: true, message: response.data.message || 'Productos asociados exitosamente' }
        }
        return { success: false, message: response.data?.message || 'Error al asociar productos' }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al asociar productos'
        return { success: false, message }
      }
    },
    [promotionId, fetchProducts],
  )

  const removeProduct = useCallback(
    async (productId: string) => {
      if (!promotionId) return { success: false, message: 'No hay promoción seleccionada' }

      try {
        const response = await api.delete(
          `/promotions/${promotionId}/products?productId=${productId}`,
          { headers: getOrgHeaders() },
        )

        if (response.data?.success) {
          setProducts((prev) => prev.filter((p) => p.id !== productId))
          return { success: true, message: response.data.message || 'Producto desasociado exitosamente' }
        }
        return { success: false, message: response.data?.message || 'Error al desasociar producto' }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al desasociar producto'
        return { success: false, message }
      }
    },
    [promotionId],
  )

  return { products, loading, error, refetch: fetchProducts, addProducts, removeProduct }
}
