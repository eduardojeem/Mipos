import { useEffect, useCallback } from 'react';
import { useCache } from './use-cache';
import { usePersistentCache } from './use-persistent-cache';
import api from '@/lib/api';
import { db } from '@/lib/db/indexed-db';
import { syncQueue, createSyncOperation } from '@/lib/db/sync-queue';
import { useOnlineStatus } from './use-online-status';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseActive } from '@/lib/env';

// Helper to get current organization ID
const getOrganizationId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('selected_organization');
    if (!raw) return null;
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      return parsed?.id || parsed?.organization_id || null;
    }
    return raw;
  } catch {
    return null;
  }
};

// ✅ Importar tipos unificados
import {
  ProductWithRelations,
  ProductFilters as UnifiedProductFilters
} from '@/types/product.unified';

// ✅ Usar tipos unificados
export type Product = ProductWithRelations;
export type ProductFilters = UnifiedProductFilters;

import { productService } from '@/services/productService';

/**
 * Fetch products with offline support - tries online first, falls back to IndexedDB
 */
async function fetchProductsWithOffline(filters: ProductFilters = {}, signal?: AbortSignal): Promise<Product[]> {
  // Check if request was cancelled
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  try {
    // Try online first
    if (isSupabaseActive()) {
       const supabase = createClient();
       const orgId = getOrganizationId();
       
       let query = supabase.from('products').select(`
        *,
        category:categories(*),
        supplier:suppliers(*)
       `);
       
       if (orgId) {
         query = query.eq('organization_id', orgId);
       }
       
       if (filters.category_id) query = query.eq('category_id', filters.category_id);
       if (filters.supplier_id) query = query.eq('supplier_id', filters.supplier_id);
       if (filters.search) query = query.ilike('name', `%${filters.search}%`);
       if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);
       if (filters.min_price) query = query.gte('sale_price', filters.min_price);
       if (filters.max_price) query = query.lte('sale_price', filters.max_price);
       if (filters.min_stock) query = query.gte('stock_quantity', filters.min_stock);
       if (filters.max_stock) query = query.lte('stock_quantity', filters.max_stock);

       const { data, error } = await query.order('created_at', { ascending: false }).limit(filters.limit || 50);
       
       if (error) throw error;

       // Store in IndexedDB for offline access
       if (data && data.length > 0) {
         try {
           await Promise.all(
             data.map((product: any) =>
               db.put('products', {
                 ...product,
                 updated_at: product.updated_at || new Date().toISOString()
               })
             )
           );
         } catch (dbError) {
           console.warn('⚠️ Error al guardar productos en IndexedDB:', dbError);
         }
       }
       return data;
    }

    const serviceFilters: any = {
      ...filters,
      categoryId: filters.category_id,
      supplierId: filters.supplier_id,
      minPrice: filters.min_price,
      maxPrice: filters.max_price,
      minStock: filters.min_stock,
      maxStock: filters.max_stock,
      isActive: filters.is_active
    };

    const response = await productService.getProducts({
      filters: serviceFilters,
      page: filters.page,
      limit: filters.limit || 50
    });

    // Store in IndexedDB for offline access
    if (response.products && response.products.length > 0) {
      try {
        await Promise.all(
          response.products.map(product =>
            db.put('products', {
              ...product,
              updated_at: product.updated_at || new Date().toISOString()
            })
          )
        );
      } catch (dbError) {
        console.warn('⚠️ Error al guardar productos en IndexedDB:', dbError);
      }
    }

    return response.products;
  } catch (onlineError) {
    console.warn('⚠️ Error al obtener productos online, intentando IndexedDB:', onlineError);

    // Fallback to IndexedDB
    try {
      let products: Product[] = [];

      if (filters.category_id) {
        // Query by category
        products = await db.query<Product>('products', 'by-category', filters.category_id);
      } else if (filters.search) {
        // Simple text search in name and SKU
        const allProducts = await db.getAll<Product>('products');
        const searchLower = filters.search.toLowerCase();
        products = allProducts.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower)
        );
      } else if (filters.is_active !== undefined) {
        // Filter by active status
        const allProducts = await db.getAll<Product>('products');
        products = allProducts.filter(p => p.is_active === filters.is_active);
      } else {
        // Get all products
        products = await db.getAll<Product>('products');
      }

      // Apply additional filters
      if (filters.min_price !== undefined) {
        products = products.filter(p => p.sale_price >= filters.min_price!);
      }
      if (filters.max_price !== undefined) {
        products = products.filter(p => p.sale_price <= filters.max_price!);
      }
      if (filters.min_stock !== undefined) {
        products = products.filter(p => p.stock_quantity >= filters.min_stock!);
      }
      if (filters.max_stock !== undefined) {
        products = products.filter(p => p.stock_quantity <= filters.max_stock!);
      }

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      return products.slice(startIndex, endIndex);
    } catch (dbError) {
      console.error('❌ Error al obtener productos de IndexedDB:', dbError);
      throw onlineError; // Throw original online error
    }
  }
}

/**
 * Fetch product by SKU with offline support
 */
async function fetchProductBySkuWithOffline(sku: string, signal?: AbortSignal): Promise<Product | null> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  if (!sku?.trim()) {
    return null;
  }

  try {
    // Try online first
    const response = await productService.getProducts({
      filters: { search: sku },
      limit: 10
    });

    const list = response.products;
    // Find exact match first, otherwise return first result
    const exact = list.find(p => String(p.sku || '').toLowerCase() === String(sku).toLowerCase());
    const product = exact || list[0] || null;

    // Store in IndexedDB if found
    if (product) {
      try {
        await db.put('products', {
          ...product,
          updated_at: product.updated_at || new Date().toISOString()
        });
      } catch (dbError) {
        console.warn('⚠️ Error al guardar producto en IndexedDB:', dbError);
      }
    }

    return product;
  } catch (onlineError) {
    console.warn('⚠️ Error al obtener producto por SKU online, intentando IndexedDB:', onlineError);

    // Fallback to IndexedDB
    try {
      const allProducts = await db.getAll<Product>('products');
      const exact = allProducts.find(p => String(p.sku || '').toLowerCase() === String(sku).toLowerCase());
      return exact || null;
    } catch (dbError) {
      console.error('❌ Error al obtener producto de IndexedDB:', dbError);
      throw onlineError;
    }
  }
}

/**
 * Fetch products by category with offline support
 */
async function fetchProductsByCategoryWithOffline(categoryId: string, limit = 50, signal?: AbortSignal): Promise<Product[]> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  if (!categoryId) {
    return [];
  }

  try {
    // Try online first
    const response = await productService.getProducts({
      filters: { categoryId },
      limit
    });

    // Store in IndexedDB
    if (response.products && response.products.length > 0) {
      try {
        await Promise.all(
          response.products.map(product =>
            db.put('products', {
              ...product,
              updated_at: product.updated_at || new Date().toISOString()
            })
          )
        );
      } catch (dbError) {
        console.warn('⚠️ Error al guardar productos en IndexedDB:', dbError);
      }
    }

    return response.products;
  } catch (onlineError) {
    console.warn('⚠️ Error al obtener productos por categoría online, intentando IndexedDB:', onlineError);

    // Fallback to IndexedDB
    try {
      const products = await db.query<Product>('products', 'by-category', categoryId);
      return products.slice(0, limit);
    } catch (dbError) {
      console.error('❌ Error al obtener productos de IndexedDB:', dbError);
      throw onlineError;
    }
  }
}

/**
 * Fetch low stock products with offline support
 */
async function fetchLowStockProductsWithOffline(threshold = 10, signal?: AbortSignal): Promise<Product[]> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  try {
    // Try online first
    const response = await productService.getProducts({
      filters: { lowStock: true },
      limit: 100
    });

    // Store in IndexedDB
    if (response.products && response.products.length > 0) {
      try {
        await Promise.all(
          response.products.map(product =>
            db.put('products', {
              ...product,
              updated_at: product.updated_at || new Date().toISOString()
            })
          )
        );
      } catch (dbError) {
        console.warn('⚠️ Error al guardar productos en IndexedDB:', dbError);
      }
    }

    return response.products;
  } catch (onlineError) {
    console.warn('⚠️ Error al obtener productos con bajo stock online, intentando IndexedDB:', onlineError);

    // Fallback to IndexedDB
    try {
      const allProducts = await db.getAll<Product>('products');
      return allProducts.filter(p => p.stock_quantity <= threshold);
    } catch (dbError) {
      console.error('❌ Error al obtener productos de IndexedDB:', dbError);
      throw onlineError;
    }
  }
}

// Helper to serialize filters into a stable cache key
function serializeProductFilters(filters: ProductFilters = {}): string {
  const entries = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .sort(); // ensure stable ordering regardless of object key order
  return entries.join('&');
}

// Hook for general product listing with filters and offline support
export function useProducts(filters: ProductFilters = {}) {
  const cacheKey = `products?${serializeProductFilters(filters)}`;
  const isOnline = useOnlineStatus();

  const result = useCache<Product[]>(
    cacheKey,
    (signal) => fetchProductsWithOffline(filters, signal),
    {
      endpoint: '/api/products',
      enabled: true,
      ttl: 5 * 60 * 1000,
      refreshOnFocus: false
    }
  );

  // Prefetch next page for better UX (only if we have a page number)
  useEffect(() => {
    if (result.data && filters.page && filters.page > 0) {
      const nextPageFilters = { ...filters, page: (filters.page || 1) + 1 };
      // Prefetch in background after a small delay
      const timer = setTimeout(() => {
        productService.prefetchNextPage({
          filters: {
            categoryId: filters.category_id,
            search: filters.search,
            lowStock: false
          },
          page: nextPageFilters.page,
          limit: filters.limit || 50
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [result.data, filters]);

  return {
    ...result,
    isOffline: !isOnline,
    source: result.error ? 'indexeddb' : 'online'
  };
}

// Hook for individual product by SKU with offline support
export function useProductBySku(sku: string, enabled = true) {
  const isOnline = useOnlineStatus();

  const result = usePersistentCache<Product | null>(
    `product-sku-${sku}`,
    () => fetchProductBySkuWithOffline(sku),
    {
      ttl: 60 * 60 * 1000,
      enabled: enabled && !!sku
    }
  );

  return {
    ...result,
    isOffline: !isOnline,
    source: result.error ? 'indexeddb' : 'online'
  };
}

// Hook for products by category with offline support
export function useProductsByCategory(categoryId: string, limit = 50, enabled = true) {
  const isOnline = useOnlineStatus();

  const result = useCache<Product[]>(
    `products-by-category:${categoryId}:${limit}`,
    (signal) => fetchProductsByCategoryWithOffline(categoryId, limit, signal),
    {
      endpoint: '/api/products/category',
      enabled: enabled && !!categoryId,
      ttl: 10 * 60 * 1000,
      refreshOnFocus: false
    }
  );

  return {
    ...result,
    isOffline: !isOnline,
    source: result.error ? 'indexeddb' : 'online'
  };
}

// Hook for low stock products with offline support
export function useLowStockProducts(threshold = 10) {
  const isOnline = useOnlineStatus();

  const result = useCache<Product[]>(
    `low-stock-products:${threshold}`,
    (signal) => fetchLowStockProductsWithOffline(threshold, signal),
    {
      endpoint: '/api/products/low-stock',
      enabled: true,
      ttl: 2 * 60 * 1000,
      refreshInterval: 5 * 60 * 1000,
      refreshOnFocus: true
    }
  );

  return {
    ...result,
    isLoading: result.loading,
    isOffline: !isOnline,
    source: result.error ? 'indexeddb' : 'online'
  };
}

// Hook for active products only with offline support
export function useActiveProducts(filters: Omit<ProductFilters, 'is_active'> = {}) {
  return useProducts({ ...filters, is_active: true });
}

// Hook for product search with debouncing and offline support
export function useProductSearch(searchQuery: string, filters: ProductFilters = {}) {
  const searchFilters = searchQuery.trim()
    ? { ...filters, search: searchQuery.trim() }
    : filters;

  return useProducts(searchFilters);
}

// Hook for creating products with offline sync
export function useCreateProduct() {
  const isOnline = useOnlineStatus();

  const createProduct = useCallback(async (productData: Partial<Product>) => {
    try {
      if (isOnline) {
        // Online: create via API
        const response = await api.post('/api/products', productData);

        // Store in IndexedDB for offline access
        if (response.data) {
          try {
            await db.put('products', {
              ...response.data,
              updated_at: response.data.updated_at || new Date().toISOString()
            });
          } catch (dbError) {
            console.warn('⚠️ Error al guardar producto en IndexedDB:', dbError);
          }
        }

        return response.data;
      } else {
        // Offline: create locally and add to sync queue
        const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const localProduct = {
          ...productData,
          id: localId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Store in IndexedDB
        await db.put('products', localProduct);

        // Add to sync queue
        await createSyncOperation.create('product', localProduct, localId);

        console.log('✅ Producto creado offline y agregado a cola de sincronización');
        return localProduct;
      }
    } catch (error) {
      console.error('❌ Error al crear producto:', error);
      throw error;
    }
  }, [isOnline]);

  return { createProduct, isOffline: !isOnline };
}

// Hook for updating products with offline sync
export function useUpdateProduct() {
  const isOnline = useOnlineStatus();

  const updateProduct = useCallback(async (id: string, productData: Partial<Product>) => {
    try {
      if (isOnline) {
        // Online: update via API
        const response = await api.put(`/api/products/${id}`, productData);

        // Update in IndexedDB
        if (response.data) {
          try {
            await db.put('products', {
              ...response.data,
              updated_at: response.data.updated_at || new Date().toISOString()
            });
          } catch (dbError) {
            console.warn('⚠️ Error al actualizar producto en IndexedDB:', dbError);
          }
        }

        return response.data;
      } else {
        // Offline: update locally and add to sync queue
        const existingProduct = await db.get<Product>('products', id);
        if (!existingProduct) {
          throw new Error('Producto no encontrado en almacenamiento local');
        }

        const updatedProduct = {
          ...existingProduct,
          ...productData,
          updated_at: new Date().toISOString()
        };

        // Update in IndexedDB
        await db.put('products', updatedProduct);

        // Add to sync queue
        await createSyncOperation.update('product', updatedProduct);

        console.log('✅ Producto actualizado offline y agregado a cola de sincronización');
        return updatedProduct;
      }
    } catch (error) {
      console.error('❌ Error al actualizar producto:', error);
      throw error;
    }
  }, [isOnline]);

  return { updateProduct, isOffline: !isOnline };
}

// Hook for deleting products with offline sync
export function useDeleteProduct() {
  const isOnline = useOnlineStatus();

  const deleteProduct = useCallback(async (id: string) => {
    try {
      if (isOnline) {
        // Online: delete via API
        await api.delete(`/api/products/${id}`);

        // Delete from IndexedDB
        try {
          await db.delete('products', id);
        } catch (dbError) {
          console.warn('⚠️ Error al eliminar producto de IndexedDB:', dbError);
        }
      } else {
        // Offline: delete locally and add to sync queue
        const existingProduct = await db.get<Product>('products', id);
        if (!existingProduct) {
          throw new Error('Producto no encontrado en almacenamiento local');
        }

        // Delete from IndexedDB
        await db.delete('products', id);

        // Add to sync queue
        await createSyncOperation.delete('product', id);

        console.log('✅ Producto eliminado offline y agregado a cola de sincronización');
      }
    } catch (error) {
      console.error('❌ Error al eliminar producto:', error);
      throw error;
    }
  }, [isOnline]);

  return { deleteProduct, isOffline: !isOnline };
}
