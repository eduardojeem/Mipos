/**
 * Hook de Productos con Soporte Offline
 * 
 * Extiende use-products con capacidades de persistencia offline usando IndexedDB.
 * Cuando está offline, lee y escribe desde IndexedDB.
 * Cuando vuelve online, sincroniza automáticamente los cambios.
 * 
 * @author BeautyPOS Team
 * @date 2025-11-24
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { db } from '@/lib/db/indexed-db'
import { createSyncOperation } from '@/lib/db/sync-queue'
import { useOnlineStatus } from '@/hooks/use-offline-sync'
import type { Product, ProductFilters } from '@/hooks/use-products'

interface UseProductsOfflineOptions {
    enableOffline?: boolean
    autoSync?: boolean
}

interface UseProductsOfflineReturn {
    products: Product[]
    loading: boolean
    error: Error | null
    createProduct: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<Product>
    updateProduct: (id: string, data: Partial<Product>) => Promise<Product>
    deleteProduct: (id: string) => Promise<void>
    refresh: () => Promise<void>
    isOffline: boolean
}

/**
 * Hook para gestión de productos con soporte offline
 */
export function useProductsOffline(
    filters: ProductFilters = {},
    options: UseProductsOfflineOptions = {}
): UseProductsOfflineReturn {
    const { enableOffline = true, autoSync = true } = options
    const isOnline = useOnlineStatus()

    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    /**
     * Carga productos desde el servidor
     */
    const fetchFromServer = useCallback(async (): Promise<Product[]> => {
        const queryParams = new URLSearchParams()

        if (filters.category_id) queryParams.append('category', filters.category_id)
        if (filters.supplier_id) queryParams.append('supplier', filters.supplier_id)
        if (filters.search) queryParams.append('search', filters.search)
        if (filters.is_active !== undefined) queryParams.append('is_active', String(filters.is_active))
        if (filters.page) queryParams.append('page', String(filters.page))
        if (filters.limit) queryParams.append('limit', String(filters.limit))

        const response = await fetch(`/api/products?${queryParams.toString()}`)

        if (!response.ok) {
            throw new Error(`Error fetching products: ${response.statusText}`)
        }

        const data = await response.json()
        return data.data?.products || data.products || []
    }, [filters])

    /**
     * Carga productos desde IndexedDB
     */
    const fetchFromIndexedDB = useCallback(async (): Promise<Product[]> => {
        let allProducts = await db.getAll<Product>('products')

        // Aplicar filtros localmente
        if (filters.category_id) {
            allProducts = allProducts.filter(p => p.category_id === filters.category_id)
        }

        if (filters.supplier_id) {
            allProducts = allProducts.filter(p => p.supplier_id === filters.supplier_id)
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            allProducts = allProducts.filter(p =>
                p.name.toLowerCase().includes(searchLower) ||
                p.sku.toLowerCase().includes(searchLower) ||
                p.description?.toLowerCase().includes(searchLower)
            )
        }

        if (filters.is_active !== undefined) {
            allProducts = allProducts.filter(p => p.is_active === filters.is_active)
        }

        // Ordenar por nombre
        allProducts.sort((a, b) => a.name.localeCompare(b.name))

        // Aplicar paginación
        if (filters.page && filters.limit) {
            const start = (filters.page - 1) * filters.limit
            const end = start + filters.limit
            allProducts = allProducts.slice(start, end)
        } else if (filters.limit) {
            allProducts = allProducts.slice(0, filters.limit)
        }

        return allProducts
    }, [filters])

    /**
     * Carga productos (desde servidor o IndexedDB según conectividad)
     */
    const loadProducts = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            let loadedProducts: Product[]

            if (isOnline) {
                // Online: cargar desde servidor
                loadedProducts = await fetchFromServer()

                // Guardar en IndexedDB para uso offline
                if (enableOffline) {
                    for (const product of loadedProducts) {
                        await db.put('products', product)
                    }
                }
            } else {
                // Offline: cargar desde IndexedDB
                if (!enableOffline) {
                    throw new Error('Sin conexión y modo offline deshabilitado')
                }

                loadedProducts = await fetchFromIndexedDB()
            }

            setProducts(loadedProducts)
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            setError(error)
            console.error('Error loading products:', error)
        } finally {
            setLoading(false)
        }
    }, [isOnline, enableOffline, fetchFromServer, fetchFromIndexedDB])

    /**
     * Crea un nuevo producto
     */
    const createProduct = useCallback(async (
        data: Omit<Product, 'id' | 'created_at' | 'updated_at'>
    ): Promise<Product> => {
        const now = new Date().toISOString()

        if (isOnline) {
            // Online: crear en servidor
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Error desconocido' }))
                throw new Error(error.message || `Error ${response.status}`)
            }

            const result = await response.json()
            const newProduct = result.data

            // Guardar en IndexedDB
            if (enableOffline) {
                await db.put('products', newProduct)
            }

            // Actualizar lista local
            setProducts(prev => [...prev, newProduct])

            return newProduct
        } else {
            // Offline: crear localmente
            if (!enableOffline) {
                throw new Error('No se puede crear productos sin conexión')
            }

            const tempId = `temp-${Date.now()}`
            const newProduct: Product = {
                ...data,
                id: tempId,
                created_at: now,
                updated_at: now
            }

            // Guardar en IndexedDB
            await db.put('products', newProduct)

            // Agregar a cola de sincronización
            await createSyncOperation.create('product', data, tempId)

            // Actualizar lista local
            setProducts(prev => [...prev, newProduct])

            return newProduct
        }
    }, [isOnline, enableOffline])

    /**
     * Actualiza un producto existente
     */
    const updateProduct = useCallback(async (
        id: string,
        data: Partial<Product>
    ): Promise<Product> => {
        const now = new Date().toISOString()

        if (isOnline) {
            // Online: actualizar en servidor
            const response = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Error desconocido' }))
                throw new Error(error.message || `Error ${response.status}`)
            }

            const result = await response.json()
            const updatedProduct = result.data

            // Actualizar en IndexedDB
            if (enableOffline) {
                await db.put('products', updatedProduct)
            }

            // Actualizar lista local
            setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p))

            return updatedProduct
        } else {
            // Offline: actualizar localmente
            if (!enableOffline) {
                throw new Error('No se puede actualizar productos sin conexión')
            }

            const existingProduct = await db.get<Product>('products', id)

            if (!existingProduct) {
                throw new Error('Producto no encontrado')
            }

            const updatedProduct: Product = {
                ...existingProduct,
                ...data,
                id, // Mantener el ID original
                updated_at: now
            }

            // Actualizar en IndexedDB
            await db.put('products', updatedProduct)

            // Agregar a cola de sincronización
            await createSyncOperation.update('product', updatedProduct)

            // Actualizar lista local
            setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p))

            return updatedProduct
        }
    }, [isOnline, enableOffline])

    /**
     * Elimina un producto
     */
    const deleteProduct = useCallback(async (id: string): Promise<void> => {
        if (isOnline) {
            // Online: eliminar en servidor
            const response = await fetch(`/api/products/${id}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Error desconocido' }))
                throw new Error(error.message || `Error ${response.status}`)
            }

            // Eliminar de IndexedDB
            if (enableOffline) {
                await db.delete('products', id)
            }

            // Actualizar lista local
            setProducts(prev => prev.filter(p => p.id !== id))
        } else {
            // Offline: marcar como eliminado localmente
            if (!enableOffline) {
                throw new Error('No se puede eliminar productos sin conexión')
            }

            // Eliminar de IndexedDB
            await db.delete('products', id)

            // Agregar a cola de sincronización
            await createSyncOperation.delete('product', id)

            // Actualizar lista local
            setProducts(prev => prev.filter(p => p.id !== id))
        }
    }, [isOnline, enableOffline])

    /**
     * Refresca la lista de productos
     */
    const refresh = useCallback(async () => {
        await loadProducts()
    }, [loadProducts])

    // Cargar productos al montar o cuando cambien los filtros
    useEffect(() => {
        loadProducts()
    }, [loadProducts])

    // Recargar cuando vuelva la conexión
    useEffect(() => {
        if (isOnline && autoSync) {
            loadProducts()
        }
    }, [isOnline, autoSync, loadProducts])

    return {
        products,
        loading,
        error,
        createProduct,
        updateProduct,
        deleteProduct,
        refresh,
        isOffline: !isOnline
    }
}

/**
 * Hook simplificado para obtener un producto por ID con soporte offline
 */
export function useProductByIdOffline(id: string | null, enableOffline = true) {
    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const isOnline = useOnlineStatus()

    useEffect(() => {
        if (!id) {
            setProduct(null)
            setLoading(false)
            return
        }

        const loadProduct = async () => {
            setLoading(true)
            setError(null)

            try {
                if (isOnline) {
                    // Online: cargar desde servidor
                    const response = await fetch(`/api/products/${id}`)

                    if (!response.ok) {
                        throw new Error(`Error fetching product: ${response.statusText}`)
                    }

                    const data = await response.json()
                    const loadedProduct = data.data

                    // Guardar en IndexedDB
                    if (enableOffline) {
                        await db.put('products', loadedProduct)
                    }

                    setProduct(loadedProduct)
                } else {
                    // Offline: cargar desde IndexedDB
                    if (!enableOffline) {
                        throw new Error('Sin conexión y modo offline deshabilitado')
                    }

                    const loadedProduct = await db.get<Product>('products', id)
                    setProduct(loadedProduct || null)
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err))
                setError(error)
                console.error('Error loading product:', error)
            } finally {
                setLoading(false)
            }
        }

        loadProduct()
    }, [id, isOnline, enableOffline])

    return { product, loading, error, isOffline: !isOnline }
}
