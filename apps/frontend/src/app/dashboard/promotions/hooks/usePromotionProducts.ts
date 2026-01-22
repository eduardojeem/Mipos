import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

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

export function usePromotionProducts(promotionId: string | null): UsePromotionProductsReturn {
  const [products, setProducts] = useState<PromotionProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    if (!promotionId) {
      setProducts([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.get(`/promotions/${promotionId}/products`)
      
      if (response.data?.success) {
        setProducts(response.data.data || [])
      } else {
        setError(response.data?.message || 'Error al cargar productos')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error al cargar productos')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [promotionId])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const addProducts = useCallback(async (productIds: string[]) => {
    if (!promotionId) {
      return { success: false, message: 'No hay promoción seleccionada' }
    }

    try {
      const response = await api.post(`/promotions/${promotionId}/products`, {
        productIds
      })

      if (response.data?.success) {
        // Optimistic update
        await fetchProducts()
        return { 
          success: true, 
          message: response.data.message || 'Productos asociados exitosamente' 
        }
      } else {
        return { 
          success: false, 
          message: response.data?.message || 'Error al asociar productos' 
        }
      }
    } catch (err: any) {
      return { 
        success: false, 
        message: err?.response?.data?.message || err?.message || 'Error al asociar productos' 
      }
    }
  }, [promotionId, fetchProducts])

  const removeProduct = useCallback(async (productId: string) => {
    if (!promotionId) {
      return { success: false, message: 'No hay promoción seleccionada' }
    }

    try {
      const response = await api.delete(`/promotions/${promotionId}/products?productId=${productId}`)

      if (response.data?.success) {
        // Optimistic update
        setProducts(prev => prev.filter(p => p.id !== productId))
        return { 
          success: true, 
          message: response.data.message || 'Producto desasociado exitosamente' 
        }
      } else {
        return { 
          success: false, 
          message: response.data?.message || 'Error al desasociar producto' 
        }
      }
    } catch (err: any) {
      return { 
        success: false, 
        message: err?.response?.data?.message || err?.message || 'Error al desasociar producto' 
      }
    }
  }, [promotionId])

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    addProducts,
    removeProduct
  }
}
